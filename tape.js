// tape.js — Tape Measure game UI (canvas rendering)
// Shows a 12-inch tape measure with tick marks. User reads the
// measurement at the red arrow position.
// Tick hierarchy: 1in=48px, 1/2=38px, 1/4=28px, 1/8=22px, 1/16=16px, 1/32=10px, 1/64=6px

var TapeGame = (function() {
  'use strict';

  var SCALE = 100; // pixels per inch
  var LENGTH_IN = 12;
  var CANVAS_W = LENGTH_IN * SCALE + 60; // + margin
  var CANVAS_H = 180;
  var TICK_BASE_Y = 140;
  var LABEL_Y = 168;

  function tickHeight(precision) {
    if (precision <= 1) return 48;
    if (precision <= 2) return 38;
    if (precision <= 4) return 28;
    if (precision <= 8) return 22;
    if (precision <= 16) return 16;
    if (precision <= 32) return 10;
    return 6;
  }

  function init(panel) {
    var settingsDef = [
      { key: 'precision', label: 'Smallest graduation', type: 'select',
        options: [
          { value: '1', label: '1 inch' },
          { value: '2', label: '1/2 inch' },
          { value: '4', label: '1/4 inch' },
          { value: '8', label: '1/8 inch' },
          { value: '16', label: '1/16 inch' },
          { value: '32', label: '1/32 inch' },
          { value: '64', label: '1/64 inch' }
        ]
      }
    ];

    var defaults = { precision: '16' };
    var settings = weldtrain.loadSettings('tape', defaults);
    var engine = weldtrain.createEngine('tape', { levelUpAfter: 10 });

    panel.innerHTML =
      '<div class="question" id="tape-question">Loading...</div>' +
      '<div class="ruler-container" style="overflow-x:auto; max-width:960px;">' +
        '<canvas id="tape-canvas" width="' + CANVAS_W + '" height="' + CANVAS_H + '" style="min-width:' + CANVAS_W + 'px;"></canvas>' +
      '</div>' +
      '<div class="answer-area">' +
        '<input type="text" id="tape-answer" placeholder="Your reading (e.g. 5 3/8 or 5.375)" autocomplete="off">' +
      '</div>' +
      '<div class="action-buttons">' +
        '<button class="btn btn-primary" id="tape-check">Check Answer</button>' +
        '<button class="btn btn-secondary" id="tape-skip">Skip</button>' +
        '<button class="btn btn-warning" id="tape-settings">⚙ Settings</button>' +
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

    var canvas = panel.querySelector('#tape-canvas');
    var ctx = canvas.getContext('2d');
    var questionEl = panel.querySelector('#tape-question');
    var answerInput = panel.querySelector('#tape-answer');

    function makeSettings(precision) {
      return { questionPrecision: precision };
    }

    function generateQuestion() {
      var precision = parseInt(settings.precision, 10);
      // Random target within the full 12-inch ruler
      var targetInches = Math.random() * LENGTH_IN;
      // Snap to nearest 1/precision
      var targetTicks = Math.round(targetInches * precision);
      return {
        targetTicks: targetTicks,
        precision: precision
      };
    }

    function drawTape(q) {
      var precision = q.precision;
      var h = tickHeight(precision);

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Tape body
      ctx.fillStyle = '#d0d0d0';
      ctx.fillRect(30, 40, LENGTH_IN * SCALE, 100);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 40, LENGTH_IN * SCALE, 100);

      // Tick marks at every precision increment
      var totalTicks = LENGTH_IN * precision;
      for (var i = 0; i <= totalTicks; i++) {
        var inchPos = i / precision;
        var x = 30 + inchPos * SCALE;

        // Determine tick significance and height
        var markLength;
        var showLabel = false;
        var fracNum = i % precision;

        if (fracNum === 0) {
          markLength = tickHeight(1);
          showLabel = true;
        } else if (precision >= 2 && fracNum === precision / 2) {
          markLength = tickHeight(2);
        } else if (precision >= 4 && (fracNum === precision / 4 || fracNum === 3 * precision / 4)) {
          markLength = tickHeight(4);
        } else if (precision >= 8) {
          // 1/8 and finer
          var eighth = precision / 8;
          if (fracNum % eighth === 0) {
            markLength = tickHeight(8);
          } else {
            markLength = h;
          }
        } else {
          markLength = h;
        }

        // Draw tick
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 1, TICK_BASE_Y - markLength, 2, markLength);

        // Inch labels
        if (showLabel) {
          ctx.fillStyle = '#000';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(Math.floor(inchPos), x, LABEL_Y);
        }
      }

      // Red arrow at target position
      var targetInches = q.targetTicks / precision;
      var targetX = 30 + targetInches * SCALE;
      ctx.fillStyle = '#d00';
      ctx.beginPath();
      ctx.moveTo(targetX, TICK_BASE_Y);
      ctx.lineTo(targetX - 8, TICK_BASE_Y - 18);
      ctx.lineTo(targetX + 8, TICK_BASE_Y - 18);
      ctx.closePath();
      ctx.fill();
    }

    function newQuestion() {
      var q = generateQuestion();
      drawTape(q);
      questionEl.textContent = 'Read the measurement at the red marker.';
      answerInput.value = '';
      answerInput.focus();
      // Scroll to target position for visibility
      var targetInches = q.targetTicks / q.precision;
      var targetPx = targetInches * SCALE;
      var container = panel.querySelector('.ruler-container');
      container.scrollLeft = Math.max(0, targetPx - 200);
      return q;
    }

    var currentQuestion = null;

    function checkAnswer() {
      if (engine.isGameOver()) {
        engine.reset();
        currentQuestion = newQuestion();
        return;
      }

      var input = answerInput.value.trim();
      if (!input) return;

      if (TapeLogic.validateAnswer(input, currentQuestion.targetTicks, currentQuestion.precision)) {
        engine.recordCorrect();
        showFeedback(true, 'Correct!');
      } else {
        engine.recordStrike();
        var correctStr = TapeLogic.formatTarget(currentQuestion.targetTicks, makeSettings(currentQuestion.precision));
        showFeedback(false, 'Incorrect. The correct reading is ' + correctStr);
      }

      setTimeout(function() {
        currentQuestion = newQuestion();
      }, 1500);
    }

    function showFeedback(correct, message) {
      var existing = panel.querySelector('.feedback');
      if (existing) existing.remove();

      var fb = document.createElement('div');
      fb.className = 'feedback ' + (correct ? 'correct' : 'wrong');
      fb.textContent = message;
      panel.querySelector('.ruler-container').after(fb);

      setTimeout(function() {
        if (fb.parentNode) fb.parentNode.removeChild(fb);
      }, 2000);
    }

    panel.querySelector('#tape-check').addEventListener('click', checkAnswer);
    panel.querySelector('#tape-skip').addEventListener('click', function() {
      if (engine.isGameOver()) {
        engine.reset();
        currentQuestion = newQuestion();
        return;
      }
      engine.recordStrike();
      var correctStr = TapeLogic.formatTarget(currentQuestion.targetTicks, makeSettings(currentQuestion.precision));
      showFeedback(false, 'Skipped. Correct answer: ' + correctStr);
      setTimeout(function() {
        currentQuestion = newQuestion();
      }, 1500);
    });

    panel.querySelector('#tape-settings').addEventListener('click', function() {
      var form = weldtrain.buildSettingsPanel(panel, settingsDef);
      form.querySelector('.apply-btn').addEventListener('click', function() {
        var newSettings = weldtrain.readSettingsFromForm(form);
        for (var k in newSettings) { settings[k] = newSettings[k]; }
        weldtrain.saveSettings('tape', settings);
        weldtrain.restorePanel(panel, 'tape');
      });
    });

    answerInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') checkAnswer();
    });

    currentQuestion = newQuestion();
  }

  return { init: init };
})();

window.registerModule('tape', 'Tape Measure', TapeGame.init);