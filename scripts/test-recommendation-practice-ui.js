"use strict";
const assert = require("assert");
const fs = require("fs");
require("../js/core/review-selector.js");
require("../js/core/weakness-selector.js");
const recommendation = require("../js/core/recommendation-selector.js");
function presentation(value) { return recommendation.getRecommendationPresentation(value); }
assert.match(presentation({mode:"review",targetCount:3}).message, /間違えた問題が3問/); // 1
assert.match(presentation({mode:"weakness",targetCount:2}).message, /苦手になっている問題が2問/); // 2
assert.match(presentation({mode:"normal",targetCount:0}).message, /通常練習/); // 3
assert.equal(presentation({mode:"review",targetCount:1}).mode,"review"); // 4: launcher routes to existing review mode
assert.equal(presentation({mode:"weakness",targetCount:1}).mode,"weakness"); // 5: existing weakness mode
assert.equal(presentation({mode:"normal",targetCount:0}).mode,"normal"); // 6: existing normal mode
assert.deepEqual([presentation({mode:"review",targetCount:1}).mode,presentation({mode:"weakness",targetCount:1}).mode,presentation({mode:"normal",targetCount:0}).mode],["review","weakness","normal"]); // 7 / 8
assert.doesNotThrow(() => presentation({mode:"review",targetCount:0})); // 9
assert.equal(presentation(null).mode,"normal"); // 10
const source={mode:"weakness",targetCount:2}; const before=JSON.stringify(source); presentation(source); assert.equal(JSON.stringify(source),before); // 11
const launcherSource = fs.readFileSync(require.resolve("../js/ui/practice-view.js"), "utf8");
assert.match(launcherSource, /if \(mode === "review"\) return selectReviewMode\(\);/);
assert.match(launcherSource, /if \(mode === "weakness"\) return selectWeaknessMode\(\);/);
assert.match(launcherSource, /launcher\.mode = "practice"/);
assert.doesNotMatch(launcherSource, /mode:\s*["']recommended["']/);
console.log("PASS: recommendation-practice UI tests completed");
