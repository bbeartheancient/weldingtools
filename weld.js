// weld.js — AWS Weld Symbol Trainer (Identify/Read/Build modes)

var WeldGame = (function() {
  'use strict';

  var PARTS = [
    { id: 1, name: 'Arrow', desc: 'Points to the joint' },
    { id: 2, name: 'Leader', desc: 'Line from arrow to reference line' },
    { id: 3, name: 'Reference line', desc: 'Horizontal baseline for all symbols' },
    { id: 4, name: 'Weld type', desc: 'Symbol indicating weld type (e.g. triangle=fillet)' },
    { id: 5, name: 'Shop/Field weld', desc: 'Flag at the arrow/reference-line junction indicates field weld' },
    { id: 6, name: 'Weld size', desc: 'Fillet weld leg length, left of symbol' },
    { id: 7, name: 'Weld symbol', desc: 'The weld type graphic' },
    { id: 8, name: 'Contour', desc: 'Flush/convex/concave finish' },
    { id: 9, name: 'Finish', desc: 'Method of finishing the contour' },
    { id: 10, name: 'Root gap', desc: 'Right side of reference line (groove welds)' },
    { id: 11, name: 'Intermittent welds', desc: 'Dash/space lengths on reference line' },
    { id: 12, name: 'Tail', desc: 'Extends for additional info' },
    { id: 13, name: 'Process reference', desc: 'Welding process code in tail' }
  ];

  var WELD_TYPES = [
    { id: 'fillet', name: 'Fillet', symbol: 'triangle' },
    { id: 'groove', name: 'V-groove', symbol: 'vee' },
    { id: 'plug', name: 'Plug', symbol: 'rectangle' },
    { id: 'slot', name: 'Slot', symbol: 'rectangle' },
    { id: 'seam', name: 'Resistance seam', symbol: 'circle-with-parallel-lines' }
  ];

  var CANVAS_W = 900;
  var CANVAS_H = 500;

  function init(panel) {
    var settingsDef = [
      { key: 'quizMode', label: 'Quiz mode', type: 'radio',
        options: [
          {value: 'identify', label: 'Identify Parts'},
          {value: 'read', label: 'Read Symbol'},
          {value: 'build', label: 'Build Symbol'}
        ]
      },
      { key: 'weldType', label: 'Weld types', type: 'select',
        options: [
          {value: 'all', label: 'All types'},
          {value: 'fillet', label: 'Fillet only'},
          {value: 'groove', label: 'Groove only'}
        ]
      }
    ];

    var defaults = { quizMode: 'identify', weldType: 'all' };
    var settings = weldtrain.loadSettings('weld', defaults);
    var engine = weldtrain.createEngine('weld', { levelUpAfter: 10 });

    panel.innerHTML =
      '<div class="question" id="weld-question">Loading...</div>' +
      '<div class="game-area"><canvas id="weld-canvas" width="' + CANVAS_W + '" height="' + CANVAS_H + '"></canvas></div>' +
      '<div class="answer-area">' +
        '<input type="text" id="weld-answer" placeholder="Your answer" autocomplete="off">' +
      '</div>' +
      '<div class="build-area" id="weld-build-area" style="display:none;"></div>' +
      '<div class="action-buttons">' +
        '<button class="btn btn-primary" id="weld-check">Check Answer</button>' +
        '<button class="btn btn-secondary" id="weld-skip">Skip</button>' +
        '<button class="btn btn-warning" id="weld-settings">⚙ Settings</button>' +
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

    var canvas = panel.querySelector('#weld-canvas');
    var ctx = canvas.getContext('2d');
    var questionEl = panel.querySelector('#weld-question');
    var answerInput = panel.querySelector('#weld-answer');
    var buildArea = panel.querySelector('#weld-build-area');
    var currentQuestion = null;
    // Build mode has no construction surface yet; gate it so it never scores.
    var buildAvailable = true;

    var IDENTIFY_SYNONYMS = {
      1: ['arrow'],
      2: ['leader', 'leader line'],
      3: ['reference line', 'reference', 'baseline'],
      4: ['weld type'],
      5: ['shop field weld', 'shop weld', 'field weld', 'flag'],
      6: ['weld size', 'size'],
      7: ['weld symbol', 'symbol'],
      8: ['contour'],
      9: ['finish'],
      10: ['root gap', 'root opening', 'gap'],
      11: ['intermittent welds', 'intermittent', 'intermittent weld'],
      12: ['tail'],
      13: ['process reference', 'process', 'process code']
    };

    function normalizeIdentify(s) {
      return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function identifyCorrect(input, part) {
      var n = normalizeIdentify(input);
      if (n.length < 3) return false;
      var accepted = [normalizeIdentify(part.name)].concat((IDENTIFY_SYNONYMS[part.id] || []).map(normalizeIdentify));
      return accepted.indexOf(n) !== -1;
    }

    function randomSpec() {
      var weldType = null;
      if (settings.weldType === 'all') {
        weldType = WELD_TYPES[Math.floor(Math.random() * WELD_TYPES.length)];
      } else {
        weldType = WELD_TYPES.find(function(t) { return t.id === settings.weldType; });
      }

      var sizes = [1, 1.5, 2, 2.5, 3, 3.5, 4];
      var size = sizes[Math.floor(Math.random() * sizes.length)];
      var side = Math.random() < 0.5 ? 'arrow' : 'far';
      return {
        weldType: weldType,
        size: size,
        side: side,
        intermittent: Math.random() < 0.15,
        field: Math.random() < 0.08,
        tail: Math.random() < 0.1,
        processCode: '111',
        contour: 'flush',
        finish: 'C',
        rootOpening: 0,
        allAround: false
      };
    }

    function drawSymbol(spec, highlightPart) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#333';
      ctx.font = '16px Arial';
      ctx.lineWidth = 2;

      var refY = 250;
      var arrowX = 100;
      var symbolX = 380;
      var flagX = arrowX;
      var tailX = 750;

      // Reference line (part 3)
      if (highlightPart === 3) {
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 4;
      } else {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
      }
      ctx.beginPath();
      ctx.moveTo(arrowX, refY);
      ctx.lineTo(tailX, refY);
      ctx.stroke();

      // Leader line (part 2) - horizontal, aligned with arrowhead
      if (highlightPart === 2) {
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 4;
      } else {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
      }
      ctx.beginPath();
      ctx.moveTo(arrowX, refY);
      ctx.lineTo(arrowX + 40, refY);
      ctx.stroke();

      // Arrow head (part 1) - aligned with leader
      if (highlightPart === 1) {
        ctx.fillStyle = '#e74c3c';
      } else {
        ctx.fillStyle = '#333';
      }
      ctx.beginPath();
      ctx.moveTo(arrowX + 40, refY);
      ctx.lineTo(arrowX + 30, refY - 5);
      ctx.lineTo(arrowX + 30, refY + 5);
      ctx.closePath();
      ctx.fill();

      // Joint (arrow tip landing point)
      ctx.beginPath();
      ctx.arc(arrowX + 40, refY, 3, 0, Math.PI * 2);
      ctx.fillStyle = (highlightPart === 1) ? '#e74c3c' : '#333';
      ctx.fill();

      // All-around circle at the junction
      if (spec.allAround) {
        ctx.beginPath();
        ctx.arc(arrowX + 40, refY, 12, 0, Math.PI * 2);
        ctx.strokeStyle = (highlightPart === 7) ? '#e74c3c' : '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Weld symbol (part 7) and weld type (part 4): distinct highlights
      var hlType = (highlightPart === 4);
      var hlSymbol = (highlightPart === 7);
      ctx.fillStyle = hlType ? '#e74c3c' : 'transparent';
      ctx.strokeStyle = (hlSymbol || hlType) ? '#e74c3c' : '#333';
      ctx.lineWidth = (hlType || hlSymbol) ? 4 : 2;
      var sides = spec.side === 'both' ? [1, -1] : [spec.side === 'arrow' ? 1 : -1];
      sides.forEach(function(side) {
        var y = refY + side * 30;
        ctx.beginPath();
        if (spec.weldType.id === 'fillet') {
          ctx.moveTo(symbolX, refY);
          ctx.lineTo(symbolX, y);
          ctx.lineTo(symbolX + 30, refY);
          ctx.closePath();
        } else if (spec.weldType.id === 'groove') {
          ctx.moveTo(symbolX, y);
          ctx.lineTo(symbolX + 15, refY);
          ctx.lineTo(symbolX + 30, y);
        } else if (spec.weldType.id === 'plug') {
          ctx.arc(symbolX + 20, refY, 14, 0, Math.PI * 2);
        } else if (spec.weldType.id === 'slot') {
          ctx.rect(symbolX, refY - 11, 40, 22);
        } else if (spec.weldType.id === 'seam') {
          ctx.arc(symbolX + 15, refY, 18, 0, Math.PI * 2);
          ctx.moveTo(symbolX - 12, refY - 7);
          ctx.lineTo(symbolX + 42, refY - 7);
          ctx.moveTo(symbolX - 12, refY + 7);
          ctx.lineTo(symbolX + 42, refY + 7);
        }
        if (hlType) { ctx.fill(); }
        ctx.stroke();
      });

      // Weld size (part 6) - left of symbol
      if (highlightPart === 6) {
        ctx.fillStyle = '#e74c3c';
      } else {
        ctx.fillStyle = '#333';
      }
      ctx.fillText(String(spec.size), symbolX - 12, spec.side === 'arrow' ? refY + 35 : refY - 20);

      // Field weld flag (part 5)
      if (spec.field) {
        if (highlightPart === 5) {
          ctx.strokeStyle = '#e74c3c';
          ctx.lineWidth = 4;
        } else {
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
        }
        ctx.beginPath();
        ctx.moveTo(flagX, refY);
        ctx.lineTo(flagX, refY - 55);
        ctx.lineTo(flagX + 30, refY - 45);
        ctx.lineTo(flagX, refY - 35);
        ctx.stroke();
      }

      if (spec.intermittent) {
        ctx.fillStyle = highlightPart === 11 ? '#e74c3c' : '#333';
        ctx.fillText('2 (5)', symbolX + 40, spec.side === 'arrow' ? refY + 35 : refY - 20);
      }

      // Contour (part 8)
      {
        ctx.strokeStyle = (highlightPart === 8) ? '#e74c3c' : '#333';
        ctx.lineWidth = (highlightPart === 8) ? 4 : 2;
        ctx.beginPath();
        if (spec.contour === 'convex') {
          ctx.arc(symbolX + 15, refY - 28, 12, Math.PI, 0);
        } else if (spec.contour === 'concave') {
          ctx.arc(symbolX + 15, refY - 16, 12, Math.PI, 0, true);
        } else {
          ctx.moveTo(symbolX, refY - 22);
          ctx.lineTo(symbolX + 30, refY - 22);
        }
        ctx.stroke();
      }
      // Finish (part 9)
      {
        ctx.fillStyle = (highlightPart === 9) ? '#e74c3c' : '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(spec.finish || 'F', symbolX + 15, refY - 42);
      }
      // Root gap (part 10) - right side dimension for groove
      if (spec.rootOpening) {
        ctx.fillStyle = (highlightPart === 10) ? '#e74c3c' : '#333';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('G' + spec.rootOpening, symbolX + 45, refY + 5);
      }

      // Tail (part 12)
      if (spec.tail) {
        if (highlightPart === 12) {
          ctx.strokeStyle = '#e74c3c';
        } else {
          ctx.strokeStyle = '#333';
        }
        ctx.lineWidth = highlightPart === 12 ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(tailX + 40, refY - 25);
        ctx.lineTo(tailX, refY);
        ctx.lineTo(tailX + 40, refY + 25);
        ctx.stroke();

        // Process reference (part 13)
        if (highlightPart === 13) {
          ctx.fillStyle = '#e74c3c';
        } else {
          ctx.fillStyle = '#333';
        }
        ctx.font = '14px Arial';
        ctx.fillText(spec.processCode, tailX + 45, refY + 5);
      }
    }

    function normalizeSide(s) {
      if (!s) return null;
      s = s.toLowerCase().replace(/-/g, '');
      if (s === 'allaround') return 'allaround';
      return s;
    }

    function parseSizeToken(tok) {
      tok = String(tok || '').trim();
      var m = tok.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
      if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10);
      m = tok.match(/^(\d+)\s*\/\s*(\d+)$/);
      if (m) return parseInt(m[1], 10) / parseInt(m[2], 10);
      var v = parseFloat(tok);
      return isNaN(v) ? null : v;
    }

    function parseReadAnswer(input) {
      var raw = String(input || '').toLowerCase().trim();
      var size = null;
      var rest = raw;
      var m = raw.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\b/);
      if (m) { size = parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10); rest = raw.slice(m[0].length); }
      else {
        m = raw.match(/^(\d+)\s*\/\s*(\d+)\b/);
        if (m) { size = parseInt(m[1], 10) / parseInt(m[2], 10); rest = raw.slice(m[0].length); }
        else {
          m = raw.match(/^(\d+(?:\.\d+)?)\b/);
          if (m) { size = parseFloat(m[1]); rest = raw.slice(m[0].length); }
        }
      }
      var toks = rest.split(/\s+/).filter(Boolean);
      var type = toks.find(function(t) { return ['fillet','groove','plug','slot','seam'].indexOf(t) !== -1; });
      var side = toks.find(function(t) { return ['arrow','far','both','allaround','all-around'].indexOf(t) !== -1; });
      return {
        size: size,
        type: type || null,
        side: side || null,
        intermittent: toks.indexOf('intermittent') !== -1,
        field: toks.indexOf('field') !== -1,
        tail: toks.indexOf('tail') !== -1
      };
    }

    function newQuestion() {
      answerInput.value = '';
      var mode = settings.quizMode;

      if (mode === 'identify') {
        var pool = PARTS.filter(function(p) {
          return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].indexOf(p.id) !== -1;
        });
        var part = pool[Math.floor(Math.random() * pool.length)];
        var spec = randomSpec();
        if (part.id === 5) spec.field = true;
        if (part.id === 11) spec.intermittent = true;
        if (part.id === 12 || part.id === 13) spec.tail = true;
        currentQuestion = { type: 'identify', part: part, spec: spec };
        questionEl.textContent = 'Identify part #' + part.id + ' (highlighted in red).';
        drawSymbol(spec, part.id);
        answerInput.placeholder = 'Part name';
        answerInput.style.display = '';
        if (buildArea) buildArea.style.display = 'none';
      } else if (mode === 'read') {
        var spec = randomSpec();
        currentQuestion = { type: 'read', spec: spec };
        questionEl.textContent = 'Read this weld symbol. Enter: type size side (e.g. fillet 2 arrow).';
        drawSymbol(spec);
        answerInput.placeholder = 'e.g. fillet 2 arrow';
        answerInput.style.display = '';
        if (buildArea) buildArea.style.display = 'none';
      } else {
        var spec = randomSpec();
        currentQuestion = { type: 'build', spec: spec };
        questionEl.textContent = 'Build: ' + spec.size + '" ' + spec.weldType.name.toLowerCase() + ' weld, ' +
          (spec.side === 'arrow' ? 'arrow side' : 'far side') +
          (spec.intermittent ? ', intermittent' : '') +
          (spec.field ? ', field weld' : '') +
          (spec.tail ? ', tail' : '');
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        drawSymbol({ weldType: { id: 'fillet', name: 'Fillet' }, size: 0, side: 'arrow', intermittent: false, field: false, tail: false, contour: 'flush', finish: 'C', rootOpening: 0, allAround: false }, null);
        // construction surface
        if (buildArea) {
          buildArea.style.display = '';
          buildArea.innerHTML =
            '<div class="build-form">' +
            '<label>Type <select id="build-type">' +
            WELD_TYPES.map(function(t){return '<option value="'+t.id+'">'+t.name+'</option>';}).join('') +
            '</select></label>' +
            '<label>Size <select id="build-size">' +
            [1,1.5,2,2.5,3,3.5,4].map(function(v){return '<option value="'+v+'">'+v+'</option>';}).join('') +
            '</select></label>' +
            '<label>Side <select id="build-side">' +
            '<option value="arrow">arrow</option><option value="far">far</option><option value="both">both</option>' +
            '</select></label>' +
            '<label><input type="checkbox" id="build-intermittent"> Intermittent</label>' +
            '<label><input type="checkbox" id="build-field"> Field</label>' +
            '<label><input type="checkbox" id="build-tail"> Tail</label>' +
            '</div>';
        }
        answerInput.style.display = 'none';
      }
    }

    function checkAnswer() {
      if (engine.isGameOver()) {
        engine.reset();
        newQuestion();
        return;
      }

      var input = answerInput.value.trim();
      if (!input && currentQuestion.type !== 'build') return;

      if (currentQuestion.type === 'identify') {
        if (identifyCorrect(input, currentQuestion.part)) {
          engine.recordCorrect();
          showFeedback('correct', 'Correct! This is the ' + currentQuestion.part.name + '. ' + currentQuestion.part.desc);
        } else {
          engine.recordStrike();
          showFeedback('wrong', 'Incorrect. This is the ' + currentQuestion.part.name + ', not "' + input + '".');
        }
      } else if (currentQuestion.type === 'read') {
        var spec = currentQuestion.spec;
        var parsed = parseReadAnswer(input);
        var sizeOk = parsed && parsed.size !== null && Math.abs(parsed.size - spec.size) < 1e-9;
        var typeOk = parsed && parsed.type === spec.weldType.id;
        var sideOk = parsed && normalizeSide(parsed.side) === normalizeSide(spec.side);
        var intOk = parsed && parsed.intermittent === !!spec.intermittent;
        var fieldOk = parsed && parsed.field === !!spec.field;
        var tailOk = parsed && parsed.tail === !!spec.tail;
        if (sizeOk && typeOk && sideOk && intOk && fieldOk && tailOk) {
          engine.recordCorrect();
          showFeedback('correct', 'Correct! ' + spec.size + " inch " + spec.weldType.name.toLowerCase() + ' weld.');
        } else {
          engine.recordStrike();
          showFeedback('wrong', 'Incorrect. Expected ' + spec.weldType.id + ' ' + spec.size + ' ' + spec.side +
            (spec.intermittent ? ' intermittent' : '') + (spec.field ? ' field' : '') + (spec.tail ? ' tail' : '') + '.');
        }
      } else {
        // Build mode validation
        if (!buildAvailable) {
          showFeedback('wrong', 'Build mode is not available in this version; no score was recorded.');
          return;
        }
        var spec = currentQuestion.spec;
        var typeSel = panel.querySelector('#build-type');
        var sizeSel = panel.querySelector('#build-size');
        var sideSel = panel.querySelector('#build-side');
        var intCb = panel.querySelector('#build-intermittent');
        var fieldCb = panel.querySelector('#build-field');
        var tailCb = panel.querySelector('#build-tail');
        var ok = true;
        if (!typeSel || typeSel.value !== spec.weldType.id) ok = false;
        if (!sizeSel || parseFloat(sizeSel.value) !== spec.size) ok = false;
        if (!sideSel || sideSel.value !== spec.side) ok = false;
        if (!!intCb && intCb.checked !== !!spec.intermittent) ok = false;
        if (!!fieldCb && fieldCb.checked !== !!spec.field) ok = false;
        if (!!tailCb && tailCb.checked !== !!spec.tail) ok = false;
        if (ok) {
          engine.recordCorrect();
          showFeedback('correct', 'Correct! Build matches the spec.');
          drawSymbol(spec);
        } else {
          engine.recordStrike();
          showFeedback('wrong', 'Incorrect build. Check type, size, side and options.');
        }
      }

      setTimeout(newQuestion, 2500);
    }

    function showFeedback(type, msg) {
      var existing = panel.querySelector('.feedback');
      if (existing) existing.remove();

      var div = document.createElement('div');
      div.className = 'feedback ' + type;
      div.textContent = msg;
      panel.querySelector('.game-area').insertAdjacentElement('beforebegin', div);

      setTimeout(function() {
        if (div.parentNode) div.parentNode.removeChild(div);
      }, 2500);
    }

    panel.querySelector('#weld-check').addEventListener('click', checkAnswer);
    answerInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') checkAnswer();
    });

    panel.querySelector('#weld-skip').addEventListener('click', function() {
      if (engine.isGameOver()) {
        engine.reset();
        newQuestion();
        return;
      }
      engine.recordStrike();
      var msg = '';
      if (currentQuestion.type === 'identify') {
        msg = 'Skipped. This is the ' + currentQuestion.part.name + '. ' + currentQuestion.part.desc;
      } else if (currentQuestion.type === 'read') {
        msg = 'Skipped. The size is ' + currentQuestion.spec.size + " inches.";
      } else {
        var spec = currentQuestion.spec;
        msg = 'Skipped. This would be a ' + spec.size + '" ' + spec.weldType.name.toLowerCase() + 's ' + spec.size + '" weld on the ' + spec.side + ' side.';
      }
      showFeedback('wrong', msg);
      setTimeout(newQuestion, 2500);
    });

    panel.querySelector('#weld-settings').addEventListener('click', function() {
      var form = weldtrain.buildSettingsPanel(panel, settingsDef);
      form.querySelector('.apply-btn').addEventListener('click', function() {
        var newSettings = weldtrain.readSettingsFromForm(form);
        for (var k in newSettings) {
          settings[k] = newSettings[k];
        }
        weldtrain.saveSettings('weld', settings);
        weldtrain.restorePanel(panel, 'weld');
      });
    });

    newQuestion();
  }

  return { init: init, PARTS: PARTS };
})();

window.registerModule('weld', 'Welding Symbols', WeldGame.init);