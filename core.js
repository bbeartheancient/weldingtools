// core.js — shared engine for the welding & measuring trainer
// Provides: settings panel builder, score/streak/level state machine, tab switching
// No timer, no sound (v1). Modules register via window.registerModule().

(function () {
  'use strict';

  // ---- Module registry ----
  var modules = {};
  window.registerModule = function (id, title, initFn) {
    modules[id] = { id: id, title: title, init: initFn };
  };

  // ---- Settings persistence (localStorage, per module) ----
  var storagePrefix = 'weldtrain_';

  function loadSettings(moduleId, defaults) {
    var key = storagePrefix + moduleId + '_settings';
    try {
      var saved = localStorage.getItem(key);
      if (saved) {
        var parsed = JSON.parse(saved);
        // Merge: saved values override defaults
        var merged = {};
        for (var k in defaults) { merged[k] = defaults[k]; }
        for (var k2 in parsed) { merged[k2] = parsed[k2]; }
        return merged;
      }
    } catch (e) { /* ignore */ }
    return defaults;
  }

  function saveSettings(moduleId, settings) {
    var key = storagePrefix + moduleId + '_settings';
    try { localStorage.setItem(key, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  }

  // ---- Score/streak/level state machine ----
  function createEngine(moduleId, options) {
    // options: levelUpAfter (default 10), maxLevel (default 10)
    var levelUpAfter = options && options.levelUpAfter ? options.levelUpAfter : 10;
    var maxLevel = options && options.maxLevel ? options.maxLevel : 10;

    var score = 0;
    var level = 1;
    var strikes = 0;
    var streak = 0;
    var gameOver = false;

    function pointsForLevel(lvl) {
      return lvl * 10; // level 1→10pts, level 2→20pts, ... level 10→100pts
    }

    function reset() {
      score = 0;
      level = 1;
      strikes = 0;
      streak = 0;
      gameOver = false;
      updateDisplay();
    }

    function recordCorrect() {
      if (gameOver) { return; }
      streak++;
      score += pointsForLevel(level);
      if (streak >= levelUpAfter && level < maxLevel) {
        level++;
        streak = 0;
        onLevelUp(level);
      }
      updateDisplay();
    }

    function recordStrike() {
      if (gameOver) { return; }
      strikes++;
      streak = 0;
      if (strikes >= 3) {
        gameOver = true;
        onGameOver();
      }
      updateDisplay();
    }

    // Callbacks set by module
    var onLevelUp = function (lvl) {};
    var onGameOver = function () {};

    function updateDisplay() {
      if (engineEl) {
        engineEl.querySelector('.score').textContent = String(score);
        engineEl.querySelector('.level').textContent = String(level);
        var strikeEls = engineEl.querySelectorAll('.strike');
        for (var i = 0; i < 3; i++) {
          strikeEls[i].classList.toggle('active', i < strikes);
        }
        engineEl.querySelector('.game-over').classList.toggle('show', gameOver);
      }
    }

    var engineEl = null;
    function bindEl(el) { engineEl = el; updateDisplay(); }

    return {
      reset: reset,
      recordCorrect: recordCorrect,
      recordStrike: recordStrike,
      setOnLevelUp: function (fn) { onLevelUp = fn; },
      setOnGameOver: function (fn) { onGameOver = fn; },
      bindEl: bindEl,
      getScore: function () { return score; },
      getLevel: function () { return level; },
      isGameOver: function () { return gameOver; }
    };
  }

  // ---- Settings panel builder ----
  function buildSettingsPanel(container, settingsDef) {
    // settingsDef: array of { key, label, type: 'select'|'radio', options: [...] }
    // Snapshot the game UI BEFORE wiping — restorePanel() needs it to rebuild.
    if (!container.dataset.panelHtml) {
      container.dataset.panelHtml = container.innerHTML;
    }
    container.innerHTML = '';
    var form = document.createElement('form');
    form.className = 'settings-form';

    for (var i = 0; i < settingsDef.length; i++) {
      var s = settingsDef[i];
      var row = document.createElement('div');
      row.className = 'settings-row';

      var label = document.createElement('label');
      label.textContent = s.label + ':';
      row.appendChild(label);

      if (s.type === 'select') {
        var select = document.createElement('select');
        select.setAttribute('data-setting', s.key);
        for (var j = 0; j < s.options.length; j++) {
          var opt = document.createElement('option');
          opt.value = s.options[j].value;
          opt.textContent = s.options[j].label;
          select.appendChild(opt);
        }
        row.appendChild(select);
      } else if (s.type === 'radio') {
        var radioGroup = document.createElement('div');
        radioGroup.className = 'radio-group';
        for (var k = 0; k < s.options.length; k++) {
          var radioLabel = document.createElement('label');
          radioLabel.className = 'radio-label';
          var radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = s.key;
          radio.value = s.options[k].value;
          radio.setAttribute('data-setting', s.key);
          radioLabel.appendChild(radio);
          radioLabel.appendChild(document.createTextNode(' ' + s.options[k].label));
          radioGroup.appendChild(radioLabel);
        }
        row.appendChild(radioGroup);
      }
      form.appendChild(row);
    }

    var applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'apply-btn';
    applyBtn.textContent = 'Apply Settings';
    form.appendChild(applyBtn);

    container.appendChild(form);
    return form;
  }

  function restorePanel(container, moduleId) {
    if (!container.dataset.panelHtml) return false;
    var saved = container.dataset.panelHtml;
    delete container.dataset.panelHtml;
    container.innerHTML = saved;
    var mod = modules[moduleId];
    if (mod) {
      activeModule = null;
      initModule(moduleId);
    }
    return true;
  }

  function readSettingsFromForm(form) {
    var settings = {};
    var selects = form.querySelectorAll('select[data-setting]');
    for (var i = 0; i < selects.length; i++) {
      settings[selects[i].getAttribute('data-setting')] = selects[i].value;
    }
    var radios = form.querySelectorAll('input[type="radio"][data-setting]:checked');
    for (var j = 0; j < radios.length; j++) {
      settings[radios[j].getAttribute('data-setting')] = radios[j].value;
    }
    return settings;
  }

  // ---- Tab switching ----
  var currentTab = null;
  var activeModule = null;

  function switchTab(tabId) {
    if (currentTab === tabId) { return; }
    // Deactivate current
    if (activeModule) {
      activeModule.onDeactivate && activeModule.onDeactivate();
    }
    // Update tab buttons
    var tabs = document.querySelectorAll('#tabbar .tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tabId);
    }
    // Update panels
    var panels = document.querySelectorAll('.module-panel');
    for (var j = 0; j < panels.length; j++) {
      panels[j].classList.toggle('active', panels[j].id === 'panel-' + tabId);
    }
    currentTab = tabId;
    // Activate new module
    var mod = modules[tabId];
    if (mod) {
      var panel = document.getElementById('panel-' + tabId);
      activeModule = mod.init(panel);
    }
  }

  // Re-run a module's init after its panel was rebuilt (e.g. settings applied)
  function initModule(moduleId) {
    if (currentTab !== moduleId) return;
    var mod = modules[moduleId];
    if (!mod) return;
    var panel = document.getElementById('panel-' + moduleId);
    activeModule = mod.init(panel);
  }

  // ---- Initialization ----
  function init() {
    var tabButtons = document.querySelectorAll('#tabbar .tab');
    for (var i = 0; i < tabButtons.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          switchTab(btn.getAttribute('data-tab'));
        });
      })(tabButtons[i]);
    }
    // Switch to first tab
    switchTab('tape');
  }

  // Expose API
  window.weldtrain = {
    registerModule: window.registerModule,
    createEngine: createEngine,
    buildSettingsPanel: buildSettingsPanel,
    restorePanel: restorePanel,
    readSettingsFromForm: readSettingsFromForm,
    loadSettings: loadSettings,
    saveSettings: saveSettings
  };

  // Wait for DOM then init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();