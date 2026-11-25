(function (root) {
  var CLS = { d: 'a digit (0-9)', D: 'any non-digit', w: 'a word character (letter, digit, _)', W: 'any non-word character', s: 'whitespace', S: 'any non-whitespace', b: 'a word boundary', B: 'not a word boundary', n: 'a newline', t: 'a tab', r: 'a carriage return' };
  var CLS_AR = { d: 'رقم (0-9)', D: 'أي حاجة مش رقم', w: 'حرف أو رقم أو _', W: 'أي حاجة مش حرف أو رقم', s: 'مسافة بيضاء', S: 'أي حاجة مش مسافة', b: 'حد كلمة', B: 'مش حد كلمة', n: 'سطر جديد', t: 'تاب', r: 'رجوع السطر' };
  function quant(src, i, ar) {
    var c = src[i], txt = null, len = 0;
    if (c === '*') { txt = ar ? 'صفر مرة أو أكتر' : 'zero or more times'; len = 1; }
    else if (c === '+') { txt = ar ? 'مرة أو أكتر' : 'one or more times'; len = 1; }
    else if (c === '?') { txt = ar ? 'اختياري (صفر أو مرة)' : 'optional (zero or one time)'; len = 1; }
    else if (c === '{') {
      var m = /^\{(\d+)(,(\d*))?\}/.exec(src.slice(i));
      if (m) {
        len = m[0].length;
        if (m[2] === undefined) txt = ar ? 'بالظبط ' + m[1] + ' مرات' : 'exactly ' + m[1] + ' times';
        else if (m[3] === '') txt = ar ? m[1] + ' مرات أو أكتر' : m[1] + ' or more times';
        else txt = ar ? 'من ' + m[1] + ' لـ ' + m[3] + ' مرات' : 'between ' + m[1] + ' and ' + m[3] + ' times';
      }
    }
    if (!txt) return null;
    if (src[i + len] === '?') { len++; txt += ar ? ' (أقل قدر ممكن)' : ' (as few as possible)'; }
    return { txt: txt, len: len };
  }
  function explain(src, ar) {
    var out = [], i = 0, depth = 0;
    function push(tok, txt) { out.push({ tok: tok, txt: txt, depth: depth }); }
    while (i < src.length) {
      var c = src[i], q;
      if (c === '\\') {
        var n = src[i + 1] || '', t = '\\' + n;
        if (CLS[n]) push(t, ar ? CLS_AR[n] : CLS[n]);
        else if (/[1-9]/.test(n)) push(t, ar ? 'نفس اللي اتمسك في المجموعة ' + n : 'same text as group ' + n);
        else if (n === 'k') { var mm = /^\\k<(\w+)>/.exec(src.slice(i)); t = mm ? mm[0] : t; push(t, ar ? 'نفس نص المجموعة المسماة' : 'same text as the named group'); }
        else if (n === 'u' || n === 'x') { var m2 = /^\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2})/.exec(src.slice(i)); t = m2 ? m2[0] : t; push(t, ar ? 'الحرف بالكود ' + t.slice(2) : 'character code ' + t.slice(2)); }
        else if (n === 'p' || n === 'P') { var m3 = /^\\[pP]\{[^}]*\}/.exec(src.slice(i)); t = m3 ? m3[0] : t; push(t, ar ? 'خاصية يونيكود ' + t : 'unicode property ' + t); }
        else push(t, ar ? 'الحرف "' + n + '" نفسه' : 'the literal character "' + n + '"');
        i += t.length;
      } else if (c === '[') {
        var j = i + 1; if (src[j] === '^') j++;
        if (src[j] === ']') j++;
        while (j < src.length && src[j] !== ']') { if (src[j] === '\\') j++; j++; }
        var set = src.slice(i, j + 1), neg = set[1] === '^';
        push(set, (neg ? (ar ? 'أي حرف عدا: ' : 'any character except: ') : (ar ? 'أي حرف من: ' : 'any one of: ')) + set.slice(neg ? 2 : 1, -1));
        i = j + 1;
      } else if (c === '(') {
        var rest = src.slice(i), m;
        if ((m = /^\(\?<([A-Za-z_]\w*)>/.exec(rest))) { push(m[0], (ar ? 'بداية مجموعة اسمها ' : 'start of capture group named ') + m[1]); i += m[0].length; }
        else if (/^\(\?:/.test(rest)) { push('(?:', ar ? 'بداية مجموعة من غير حفظ' : 'start of non-capturing group'); i += 3; }
        else if (/^\(\?=/.test(rest)) { push('(?=', ar ? 'بعدها لازم يجي (من غير ما يتاخد)' : 'followed by (lookahead)'); i += 3; }
        else if (/^\(\?!/.test(rest)) { push('(?!', ar ? 'بعدها ممنوع يجي' : 'not followed by'); i += 3; }
        else if (/^\(\?<=/.test(rest)) { push('(?<=', ar ? 'قبلها لازم يكون (من غير ما يتاخد)' : 'preceded by (lookbehind)'); i += 4; }
        else if (/^\(\?<!/.test(rest)) { push('(?<!', ar ? 'قبلها ممنوع يكون' : 'not preceded by'); i += 4; }
        else { push('(', ar ? 'بداية مجموعة بتتحفظ' : 'start of capture group'); i++; }
        depth++;
      } else if (c === ')') { depth = Math.max(0, depth - 1); push(')', ar ? 'نهاية المجموعة' : 'end of group'); i++; }
      else if (c === '|') { push('|', ar ? 'أو' : 'or'); i++; }
      else if (c === '^') { push('^', ar ? 'بداية السطر/النص' : 'start of line/string'); i++; }
      else if (c === '$') { push('$', ar ? 'نهاية السطر/النص' : 'end of line/string'); i++; }
      else if (c === '.') { push('.', ar ? 'أي حرف' : 'any character'); i++; }
      else if ((q = quant(src, i, ar))) {
        if (out.length) out[out.length - 1].txt += ' · ' + q.txt; else push(src.slice(i, i + q.len), q.txt);
        out[out.length - 1].tok += src.slice(i, i + q.len);
        i += q.len;
      } else { push(c, (ar ? 'الحرف "' : 'the character "') + c + '"'); i++; }
    }
    return out;
  }
  function matches(src, flags, text) {
    var f = flags.indexOf('g') < 0 ? flags + 'g' : flags;
    var re = new RegExp(src, f), res = [], m, guard = 0;
    while ((m = re.exec(text)) && guard++ < 5000) {
      res.push({ index: m.index, text: m[0], groups: Array.prototype.slice.call(m, 1), named: m.groups || null });
      if (m[0] === '') re.lastIndex++;
    }
    return res;
  }
  var api = { explain: explain, matches: matches };
  if (typeof module !== 'undefined') module.exports = api; else root.RegexLens = api;
})(this);
