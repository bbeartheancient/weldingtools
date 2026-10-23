// tape-logic.js — pure logic for the Tape Measure module
// Target values are in units of (1/precision) inch.

var TapeLogic = (function () {
  'use strict';

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = b; b = a % b; a = t; }
    return a;
  }

  function simplifyFraction(num, den) {
    var whole = Math.floor(num / den);
    var remainder = num - whole * den;
    if (remainder === 0) {
      return { whole: whole, num: 0, den: 1 };
    }
    var g = gcd(remainder, den);
    return { whole: whole, num: remainder / g, den: den / g };
  }

  // Generate random target (number of precision units)
  function generateTarget(settings) {
    var prec = settings.questionPrecision;
    var maxUnits = settings.length * prec;
    var units = Math.floor(Math.random() * maxUnits) + 1;
    // Round to nearest multiple of the target step
    var step = 1;
    if (prec === 2) step = 1;
    else if (prec === 4) step = 1;
    else if (prec >= 8) step = 1;
    units = Math.round(units / step) * step;
    if (units < 1) units = step;
    return units;
  }

  function formatTarget(targetTicks, settings) {
    var prec = settings.questionPrecision;
    var notation = settings.notation || 'fraction';
    var style = settings.fractionStyle || 'reduced';

    if (notation === 'decimal') {
      var inches = targetTicks / prec;
      return inches.toFixed(4).replace(/0+$/, '').replace(/\.$/, '') + '"';
    }

    // Fraction notation
    var num = targetTicks;
    var den = prec;

    if (style === 'reduced') {
      var frac = simplifyFraction(num, den);
      if (frac.whole > 0) {
        if (frac.num > 0) {
          return frac.whole + ' ' + frac.num + '/' + frac.den + '"';
        }
        return frac.whole + '"';
      }
      return frac.num + '/' + frac.den + '"';
    }

    // Unsimplified
    if (num >= den) {
      var whole = Math.floor(num / den);
      var remainder = num % den;
      if (remainder > 0) {
        return whole + ' ' + remainder + '/' + den + '"';
      }
      return whole + '"';
    }
    return num + '/' + den + '"';
  }

  function parseAnswer(text, settings) {
    var prec = settings.questionPrecision;
    text = text.trim().replace(/\s+/g, ' ');

    // Mixed fraction: "4 3/16"
    var mixedMatch = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*("|\s)?$/);
    if (mixedMatch) {
      var whole = parseInt(mixedMatch[1], 10);
      var num = parseInt(mixedMatch[2], 10);
      var den = parseInt(mixedMatch[3], 10);
      if (den > 0 && num > 0 && num < den && prec % den === 0) {
        return whole * prec + num * (prec / den);
      }
      if (den > 0 && num > 0 && num < den) return -1;
    }

    // Fraction: "3/16"
    var fracMatch = text.match(/^(\d+)\s*\/\s*(\d+)\s*("|\s)?$/);
    if (fracMatch) {
      var num2 = parseInt(fracMatch[1], 10);
      var den2 = parseInt(fracMatch[2], 10);
      if (den2 > 0 && num2 < den2 && prec % den2 === 0) {
        return num2 * (prec / den2);
      }
      if (den2 > 0 && num2 < den2) return -1;
    }

    // Decimal or whole number
    var decMatch = text.match(/^(\d+(\.\d+)?)\s*("|\s)?$/);
    if (decMatch) {
      var inches = parseFloat(decMatch[1]);
      return Math.round(inches * prec);
    }

    return -1;
  }

  function generateTicks(length, precision) {
    var ticks = [];
    for (var i = 0; i <= length * precision; i++) {
      var pos = i / precision;
      var height = 4;
      var label = null;

      if (i % precision === 0) {
        height = 48;
        label = Math.floor(pos);
      } else if (i % (precision / 2) === 0) {
        height = 38;
      } else if (i % (precision / 4) === 0) {
        height = 28;
      } else if (i % (precision / 8) === 0) {
        height = 22;
      } else if (i % (precision / 16) === 0) {
        height = 16;
      } else if (i % (precision / 32) === 0) {
        height = 10;
      }

      ticks.push({ position: pos, height: height, label: label });
    }
    return ticks;
  }

  function validateAnswer(input, targetTicks, precision) {
    var settings = { questionPrecision: precision };
    var parsed = parseAnswer(input, settings);
    return parsed === targetTicks;
  }

  return {
    generateTarget: generateTarget,
    formatTarget: formatTarget,
    parseAnswer: parseAnswer,
    validateAnswer: validateAnswer,
    generateTicks: generateTicks
  };
})();

// Export for Node (global) and browser (window)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TapeLogic;
}
if (typeof global !== 'undefined' && typeof global.TapeLogic === 'undefined') {
  global.TapeLogic = TapeLogic;
}
if (typeof window !== 'undefined') {
  window.TapeLogic = TapeLogic;
}
