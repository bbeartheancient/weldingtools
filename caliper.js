// caliper.js — Dial Caliper game UI (Type / Find / Trainer modes)

var CaliperGame = (function() {
  'use strict';

  var CANVAS_W = 420;
  var CANVAS_H = 360;

  function init(panel) {
    var settingsDef = [
      { key: 'unit', label: 'Unit', type: 'radio',
        options: [
          {value: 'inch', label: 'Inch'},
          {value: 'cm', label: 'Centimeter'}
        ]
      },
      { key: 'resolution', label: 'Resolution', type: 'select',
        options: [
          {value: '0.001', label: '0.001 in'},
          {value: '1/64', label: '1/64 in'},
          {value: '1/32', label: '1/32 in'},
          {value: '1/16', label: '1/16 in'},
          {value: '1/8', label: '1/8 in'},
          {value: '0.01', label: '0.01 mm'},
          {value: '0.1', label: '0.1 mm'}
        ]
      },
      { key: 'mode', label: 'Mode', type: 'radio',
        options: [
          {value: 'type', label: 'Type'},
          {value: 'find', label: 'Find'},
          {value: 'trainer', label: 'Trainer'}
        ]
      }
    ];

    var defaults = { unit: 'inch', resolution: '0.001', mode: 'type' };
    var settings = weldtrain.loadSettings('caliper', defaults);
    var engine = weldtrain.createEngine('caliper', { levelUpAfter: 10 });

    panel.innerHTML =
      '<div class="question" id="caliper-question">Loading...</div>' +
      '<div class="caliper-wrap">' +
        '<canvas id="caliper-canvas" width="' + CANVAS_W + '" height="' + CANVAS_H + '"></canvas>' +
      '</div>' +
      '<div class="caliper-controls" id="caliper-controls" style="display:none;">' +
        '<button class="btn btn-secondary" id="caliper-dec" type="button">-</button>' +
        '<span class="hud-value" id="caliper-current">0</span>' +
        '<button class="btn btn-secondary" id="caliper-inc" type="button">+</button>' +
      '</div>' +
      '<div class="answer-area">' +
        '<input type="text" id="caliper-answer" placeholder="Your reading (e.g. 1.234 in or 12.34 mm)" autocomplete="off">' +
      '</div>' +
      '<div class="action-buttons">' +
        '<button class="btn btn-primary" id="caliper-check">Check Answer</button>' +
        '<button class="btn btn-secondary" id="caliper-skip">Skip</button>' +
        '<button class="btn btn-warning" id="caliper-settings">⚙ Settings</button>' +
      '</div>' +
      '<div class="engine-hud">' +
        '<div class="hud-item"><span class="hud-label">Score</span><span class="hud-value score">0</span></div>' +
        '<div class="hud-item"><span class="hud-label">Level</span><span class="hud-value level">1</span></div>' +
        '<div class="hud-item"><span class="hud-label">Strikes</span><div class="strikes">' +
          '<div class="strike"></div><div class="strike"></div><div class="strike"></div>' +
        '</div></div>' +
        '<div class="game-over">Game Over!</div>' +
      '</div>';

    engine.bindEl(panel.querySelector('.engine-hud'));

    var canvas = panel.querySelector('#caliper-canvas');
    var ctx = canvas.getContext('2d');
    var questionEl = panel.querySelector('#caliper-question');
    var answerInput = panel.querySelector('#caliper-answer');
    var answerArea = panel.querySelector('.answer-area');
    var controls = panel.querySelector('#caliper-controls');
    var currentEl = panel.querySelector('#caliper-current');
    var decBtn = panel.querySelector('#caliper-dec');
    var incBtn = panel.querySelector('#caliper-inc');

    var currentTarget = null;
    var currentSettings = null;
    var userTarget = 0;

    function maxTargetInt(s) {
      if (s.unit === 'inch') return s.resolution === '0.001' ? 6000 : 384;
      return s.resolution === '0.01' ? 15000 : 1500;
    }

    function maxDisplayUnits(s) {
      return s.unit === 'inch' ? 2 : 5;
    }

    function getSettings() {
      return { unit: settings.unit, resolution: settings.resolution };
    }

    function updateCurrentValue() {
      if (currentEl) currentEl.textContent = CaliperLogic.formatTarget(userTarget, getSettings());
    }

    function newQuestion() {
      currentSettings = getSettings();
      currentTarget = CaliperLogic.generateTarget(currentSettings);
      userTarget = 0;
      answerInput.value = '';

      if (settings.mode === 'type') {
        questionEl.textContent = 'Read the measurement displayed on the caliper.';
        answerArea.style.display = '';
        if (controls) controls.style.display = 'none';
        drawCaliper(currentTarget, currentSettings);
      } else if (settings.mode === 'find') {
        var targetStr = CaliperLogic.formatTarget(currentTarget, currentSettings);
        questionEl.textContent = 'Set the caliper to: ' + targetStr + ' — click the beam, then Check.';
        answerArea.style.display = 'none';
        if (controls) controls.style.display = '';
        drawCaliper(userTarget, currentSettings);
      } else {
        var targetStr = CaliperLogic.formatTarget(currentTarget, currentSettings);
        questionEl.textContent = 'Trainer: The target is ' + targetStr + ' — click the beam to practice.';
        answerArea.style.display = 'none';
        if (controls) controls.style.display = '';
        drawCaliper(userTarget, currentSettings);
      }
      updateCurrentValue();
    }

    function drawCaliper(targetInt, s) {
      var maxUnits = maxDisplayUnits(s);
      var canvasMax = CANVAS_W - 60;
      var scale = canvasMax / maxUnits;
      var valueUnits = CaliperLogic.targetToUnits(targetInt, s);
      var jawX = 30 + valueUnits * scale;
      jawX = Math.max(30, Math.min(30 + canvasMax, jawX));

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Beam (single scale depending on unit; FACTS has both cm top + inch bottom)
      ctx.fillStyle = '#d8d8d8';
      ctx.fillRect(30, 80, canvasMax, 50);
      ctx.strokeStyle = '#999';
      ctx.strokeRect(30, 80, canvasMax, 50);

      ctx.fillStyle = '#333';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';

      if (s.unit === 'inch') {
        // 2 inches, 20 * 0.1 in divisions
        for (var i = 0; i <= 20; i++) {
          var x = 30 + (i / 10) * scale; // 10 div per inch? scale per inch = canvasMax/2, so per 0.1in = scale/10
          // simpler: x = 30 + i * (canvasMax / 20)
          x = 30 + i * (canvasMax / 20);
          var major = (i % 10 === 0);
          ctx.beginPath();
          ctx.moveTo(x, major ? 80 : 105);
          ctx.lineTo(x, 130);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = major ? 2 : 1;
          ctx.stroke();
          if (major && i <= 20) {
            ctx.fillStyle = '#000';
            ctx.fillText(i / 10 + '"', x, 148);
          }
        }
      } else {
        // 5 cm, 50 * 0.1 cm divisions
        for (var i = 0; i <= 50; i++) {
          var x = 30 + i * (canvasMax / 50);
          var major = (i % 10 === 0);
          ctx.beginPath();
          ctx.moveTo(x, major ? 80 : 115);
          ctx.lineTo(x, 130);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = major ? 2 : 1;
          ctx.stroke();
          if (major && i <= 50) {
            ctx.fillStyle = '#000';
            ctx.fillText((i / 10) + ' cm', x, 148);
          }
        }
      }

      // Fixed jaw at zero + sliding jaw
      ctx.fillStyle = '#666';
      ctx.fillRect(26, 70, 8, 70);
      ctx.fillStyle = 'rgba(52, 152, 219, 0.25)';
      if (jawX > 34) ctx.fillRect(34, 80, jawX - 34, 50);
      ctx.fillStyle = '#c00';
      ctx.fillRect(jawX - 3, 70, 6, 70);
      ctx.beginPath();
      ctx.moveTo(jawX, 150);
      ctx.lineTo(jawX - 7, 164);
      ctx.lineTo(jawX + 7, 164);
      ctx.closePath();
      ctx.fill();

      // Dial attached to sliding jaw (below beam)
      var dialX = jawX;
      var dialY = 250;
      var dialRadius = 50;
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.arc(dialX, dialY, dialRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Determine divisions based on resolution
      var isFrac = (s.unit === 'inch' && s.resolution !== '0.001');
      var divs = isFrac ? 64 : 100;
      var revsPerUnit = s.unit === 'inch' ? 0.1 : (s.resolution === '0.01' ? 0.01 : 0.1);
      // needle fraction of one revolution
      var revs = valueUnits / revsPerUnit;
      revs = revs - Math.floor(revs);

      for (var i = 0; i < divs; i++) {
        var angle = (i / divs) * Math.PI * 2 - Math.PI / 2;
        var markLen = (i % (divs / 10 === 0 ? 10 : (isFrac ? 8 : 10)) === 0) ? 12 : 6;
        // simplify: major every 8 for frac, every 10 for decimal
        var majorStep = isFrac ? 8 : 10;
        var isMajor = (i % majorStep === 0);
        markLen = isMajor ? 12 : 6;
        var innerR = dialRadius - 4;
        var outerR = innerR - markLen;
        var x1 = dialX + innerR * Math.cos(angle);
        var y1 = dialY + innerR * Math.sin(angle);
        var x2 = dialX + outerR * Math.cos(angle);
        var y2 = dialY + outerR * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = isMajor ? 2 : 1;
        ctx.stroke();
        if (isMajor) {
          var labelR = innerR - markLen - 10;
          ctx.fillStyle = '#000';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          var label = isFrac ? (i === 0 ? '0' : (i / (divs / 8) === 0 ? '' : '')) : String(i);
          // fraction labels for frac: halves/quarters/eighths
          if (isFrac) {
            if (i % 32 === 0) label = (i / 32 === 0) ? '0' : (i / 32) + '/2';
            else if (i % 16 === 0) label = (i / 16) + '/4';
            else if (i % 8 === 0) label = (i / 8) + '/8';
            else label = '';
          } else {
            label = (i % 10 === 0) ? String(i) : '';
            if (i === 0) label = '0';
          }
          if (label !== '') {
            ctx.fillText(label, dialX + labelR * Math.cos(angle),
                         dialY + labelR * Math.sin(angle));
          }
        }
      }
      ctx.textBaseline = 'alphabetic';

      // Needle
      var needleAngle = revs * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(dialX, dialY);
      ctx.lineTo(dialX + (dialRadius - 6) * Math.cos(needleAngle),
                 dialY + (dialRadius - 6) * Math.sin(needleAngle));
      ctx.strokeStyle = '#c00';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(dialX, dialY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#c00';
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      if (settings.mode !== 'type') {
        ctx.fillText(CaliperLogic.formatTarget(targetInt, s), dialX, dialY + dialRadius + 18);
      }
    }

    function checkAnswer() {
      if (engine.isGameOver()) {
        engine.reset();
        newQuestion();
        return;
      }

      if (settings.mode === 'trainer') {
        var yours = CaliperLogic.formatTarget(userTarget, currentSettings);
        var goal = CaliperLogic.formatTarget(currentTarget, currentSettings);
        showFeedback(userTarget === currentTarget ? 'correct' : 'wrong',
          'Yours: ' + yours + ' — target: ' + goal + ' (practice, no score)');
        setTimer(newQuestion, 1500);
        return;
      }

      if (settings.mode === 'find') {
        if (CaliperLogic.withinTolerance(userTarget, currentTarget, currentSettings)) {
          engine.recordCorrect();
          showFeedback('correct', 'Correct! ' + CaliperLogic.formatTarget(currentTarget, currentSettings));
          setTimer(newQuestion, 1500);
        } else {
          engine.recordStrike();
          var correctStr = CaliperLogic.formatTarget(currentTarget, currentSettings);
          showFeedback('wrong', 'Not quite — yours reads ' +
            CaliperLogic.formatTarget(userTarget, currentSettings) + '. Target: ' + correctStr);
          setTimer(newQuestion, 2500);
        }
        return;
      }

      // Type mode
      var input = answerInput.value.trim();
      if (!input) return;

      if (CaliperLogic.validateAnswer(input, currentTarget, currentSettings)) {
        engine.recordCorrect();
        showFeedback('correct', 'Correct! ' + CaliperLogic.formatTarget(currentTarget, currentSettings));
        setTimer(newQuestion, 1500);
      } else {
        engine.recordStrike();
        var correctStr = CaliperLogic.formatTarget(currentTarget, currentSettings);
        showFeedback('wrong', 'Incorrect. Correct: ' + correctStr);
        setTimer(newQuestion, 2500);
      }
    }

    function showFeedback(type, msg) {
      var existing = panel.querySelector('.feedback');
      if (existing) existing.remove();

      var div = document.createElement('div');
      div.className = 'feedback ' + type;
      div.textContent = msg;
      panel.querySelector('.caliper-wrap').insertAdjacentElement('afterend', div);

      setTimer(function() {
        if (div.parentNode) div.parentNode.removeChild(div);
      }, 2000);
    }

    var setTimer = setTimeout;

    panel.querySelector('#caliper-check').addEventListener('click', checkAnswer);
    answerInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') checkAnswer();
    });

    panel.querySelector('#caliper-skip').addEventListener('click', function() {
      if (engine.isGameOver()) {
        engine.reset();
        newQuestion();
        return;
      }
      engine.recordStrike();
      var correctStr = CaliperLogic.formatTarget(currentTarget, currentSettings);
      showFeedback('wrong', 'Skipped. Correct: ' + correctStr);
      setTimer(newQuestion, 2000);
    });

    panel.querySelector('#caliper-settings').addEventListener('click', function() {
      var form = weldtrain.buildSettingsPanel(panel, settingsDef);
      form.querySelector('.apply-btn').addEventListener('click', function() {
        var newSettings = weldtrain.readSettingsFromForm(form);
        for (var k in newSettings) {
          settings[k] = newSettings[k];
        }
        weldtrain.saveSettings('caliper', settings);
        weldtrain.restorePanel(panel, 'caliper');
      });
    });

    function stepUserTarget(delta) {
      var s = getSettings();
      var step = CaliperLogic.stepInTargetUnits(s);
      var next = userTarget + delta * step;
      next = Math.max(0, Math.min(maxTargetInt(s), next));
      userTarget = next;
      drawCaliper(userTarget, s);
      updateCurrentValue();
    }

    if (decBtn) decBtn.addEventListener('click', function() { stepUserTarget(-1); });
    if (incBtn) incBtn.addEventListener('click', function() { stepUserTarget(1); });

    function setUserTargetFromPointer(clientX) {
      if (settings.mode !== 'find' && settings.mode !== 'trainer') return;
      var s = getSettings();
      var rect = canvas.getBoundingClientRect();
      var pxPerUnit = rect.width / CANVAS_W;
      var x = (clientX - rect.left) / pxPerUnit;
      var relX = Math.max(0, Math.min(CANVAS_W - 100, x - 50));
      var scale = (CANVAS_W - 100) / maxDisplayUnits(s);
      var guess = CaliperLogic.unitsToTarget(relX / scale, s);
      var step = CaliperLogic.stepInTargetUnits(s);
      guess = Math.round(guess / step) * step;
      guess = Math.max(0, Math.min(maxTargetInt(s), guess));
      userTarget = guess;
      drawCaliper(userTarget, s);
      updateCurrentValue();
    }

    var dragging = false;
    canvas.addEventListener('mousedown', function(e) {
      if (settings.mode !== 'find' && settings.mode !== 'trainer') return;
      dragging = true;
      setUserTargetFromPointer(e.clientX);
    });
    canvas.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      setUserTargetFromPointer(e.clientX);
    });
    if (window && typeof window.addEventListener === 'function') {
      window.addEventListener('mouseup', function() { dragging = false; });
    }

    // +/- fine controls already wired above; ensure current value updates.

    newQuestion();
  }

  return { init: init };
})();

window.registerModule('caliper', 'Dial Caliper', CaliperGame.init);