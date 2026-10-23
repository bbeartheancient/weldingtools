// caliper-logic.js — Dial Caliper game logic (pure, no DOM)
// Inch resolutions: 0.001, 1/8, 1/16, 1/32, 1/64
// Metric resolutions: 0.1mm, 0.01mm

var CaliperLogic = (function() {
  'use strict';

  function gcd(a, b) {
    while (b > 0) { var t = b; b = a % b; a = t; }
    return a;
  }

  function randomInt(lo, hi) {
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  function generateTarget(settings) {
    var unit = settings.unit || 'inch';
    var resolution = settings.resolution || '0.001';
    if (unit === 'inch') {
      if (resolution === '1/64') return randomInt(1, 128);
      if (resolution === '1/32') return randomInt(1, 64) * 2;
      if (resolution === '1/16') return randomInt(1, 32) * 4;
      if (resolution === '1/8') return randomInt(1, 16) * 8;
      return randomInt(868, 1950);
    }
    if (resolution === '0.01') return randomInt(100, 4950);
    return randomInt(10, 495);
  }

  function formatTarget(target, settings) {
    var unit = settings.unit || 'inch';
    var resolution = settings.resolution || '0.001';
    if (unit === 'inch') {
      if (resolution === '0.001') return (target / 1000).toFixed(3) + ' in';
      var whole = Math.floor(target / 64);
      var frac = target - whole * 64;
      if (frac === 0) return whole + ' in';
      var g = gcd(frac, 64);
      var num = frac / g;
      var den = 64 / g;
      if (den === 1) return (whole + num) + ' in';
      return whole > 0 ? whole + ' ' + num + '/' + den + ' in' : num + '/' + den + ' in';
    }
    if (resolution === '0.01') return (target / 100).toFixed(2) + ' mm';
    return (target / 10).toFixed(1) + ' mm';
  }

  function parseAnswer(text, settings) {
    text = text.trim();
    var unit = settings.unit || 'inch';
    var resolution = settings.resolution || '0.001';
    if (unit === 'inch') {
      if (resolution === '0.001') {
        var val = parseFloat(text.replace(/\s*in$/, ''));
        if (isNaN(val)) return null;
        return Math.round(val * 1000);
      }
      var wholeOnly = text.match(/^(\d+)\s*(?:in)?$/);
      if (wholeOnly) {
        return parseInt(wholeOnly[1], 10) * 64;
      }
      var m = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*(?:in)?$/);
      if (m) {
        var whole = parseInt(m[1], 10);
        var num = parseInt(m[2], 10);
        var den = parseInt(m[3], 10);
        if (den === 0 || num >= den || num <= 0) return null;
        return whole * 64 + Math.round(num * 64 / den);
      }
      var f = text.match(/^(\d+)\s*\/\s*(\d+)\s*(?:in)?$/);
      if (f) {
        var num2 = parseInt(f[1], 10);
        var den2 = parseInt(f[2], 10);
        if (den2 === 0 || num2 <= 0 || num2 >= den2) return null;
        return Math.round(num2 * 64 / den2);
      }
      return null;
    }
    var met = parseFloat(text.replace(/\s*m?m$/, ''));
    if (isNaN(met)) return null;
    if (resolution === '0.01') return Math.round(met * 100);
    return Math.round(met * 10);
  }

  function toDecimalInches(target) {
    return target / 1000;
  }

  function targetToUnits(target, settings) {
    var unit = settings.unit || 'inch';
    var resolution = settings.resolution || '0.001';
    if (unit === 'inch') {
      if (resolution === '0.001') return target / 1000;
      return target / 64;
    }
    if (resolution === '0.01') return target / 100;
    return target / 10;
  }

  function unitsToTarget(units, settings) {
    var unit = settings.unit || 'inch';
    var resolution = settings.resolution || '0.001';
    if (unit === 'inch') {
      if (resolution === '0.001') return Math.round(units * 1000);
      return Math.round(units * 64);
    }
    if (resolution === '0.01') return Math.round(units * 100);
    return Math.round(units * 10);
  }

  function stepInTargetUnits(settings) {
    var unit = settings.unit || 'inch';
    var resolution = settings.resolution || '0.001';
    if (unit === 'inch') {
      if (resolution === '0.001') return 1;
      var parts = resolution.split('/');
      return Math.round(64 / parseInt(parts[1], 10));
    }
    return 1;
  }

  function withinTolerance(guess, target, settings) {
    // FACTS tolerance: half of one resolution unit.
    return Math.abs(guess - target) <= 0.5;
  }

  function validateAnswer(text, target, settings) {
    var parsed = parseAnswer(text, settings);
    if (parsed === null) return false;
    var unit = settings.unit || 'inch';
    var resolution = settings.resolution || '0.001';
    if (unit === 'inch') {
      if (resolution === '0.001') {
        return parsed.toFixed(3) === target.toFixed(3);
      }
      return Math.round(parsed) === Math.round(target);
    }
    var Qmm = resolution === '0.01' ? target / 100 : target / 10;
    var guessMm = resolution === '0.01' ? parsed / 100 : parsed / 10;
    if (resolution === '0.01') {
      return guessMm.toFixed(3) === Qmm.toFixed(3) ||
        (guessMm * 10).toFixed(2) === (Qmm * 10).toFixed(2);
    }
    return guessMm.toFixed(3) === Qmm.toFixed(3);
  }

  return {
    generateTarget: generateTarget,
    formatTarget: formatTarget,
    parseAnswer: parseAnswer,
    toDecimalInches: toDecimalInches,
    targetToUnits: targetToUnits,
    unitsToTarget: unitsToTarget,
    stepInTargetUnits: stepInTargetUnits,
    validateAnswer: validateAnswer,
    withinTolerance: withinTolerance
  };
})();

// Export for Node (global) and browser (window)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CaliperLogic;
}
if (typeof global !== 'undefined' && typeof global.CaliperLogic === 'undefined') {
  global.CaliperLogic = CaliperLogic;
}
if (typeof window !== 'undefined') {
  window.CaliperLogic = CaliperLogic;
}
