/*
 * ylog
 * https://github.com/qiu8310/ylog
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

module.exports = {
  // Word-wrap text to a given width, permitting ANSI color codes.
  wraptext: function(width, text) {
    // notes to self:
    // grab 1st character or ansi code from string
    // if ansi code, add to array and save for later, strip from front of string
    // if character, add to array and increment counter, strip from front of string
    // if width + 1 is reached and current character isn't space:
    //  slice off everything after last space in array and prepend it to string
    //  etc

    // This result array will be joined on \n.
    var result = [];
    var matches, color, tmp;
    var captured = [];
    var charlen = 0;

    while ((matches = text.match(/(?:(\x1B\[\d+m)|\n|(.))([\s\S]*)/))) {
      // Updated text to be everything not matched.
      text = matches[3];

      // Matched a color code?
      if (matches[1]) {
        // Save last captured color code for later use.
        color = matches[1];
        // Capture color code.
        captured.push(matches[1]);
        continue;

        // Matched a non-newline character?
      } else if (matches[2]) {
        // If this is the first character and a previous color code was set, push
        // that onto the captured array first.
        if (charlen === 0 && color) { captured.push(color); }
        // Push the matched character.
        captured.push(matches[2]);
        // Increment the current charlen.
        charlen++;
        // If not yet at the width limit or a space was matched, continue.
        if (charlen <= width || matches[2] === ' ') { continue; }
        // The current charlen exceeds the width and a space wasn't matched.
        // "Roll everything back" until the last space character.
        tmp = captured.lastIndexOf(' ');
        text = captured.slice(tmp === -1 ? tmp : tmp + 1).join('') + text;
        captured = captured.slice(0, tmp);
      }

      // The limit has been reached. Push captured string onto result array.
      result.push(captured.join(''));

      // Reset captured array and charlen.
      captured = [];
      charlen = 0;
    }

    result.push(captured.join(''));
    return result.join('\n');
  },

  ttyWidths: function() {
    if (process.stderr.isTTY) {
      // One less than the actual as writing to the final column wraps the line
      return process.stderr.columns - 1;
    }
    return 80;
  }
};
