(function (root) {
  "use strict";
  const OTE = (root.OTE = root.OTE || {});

  const TIERS = [
    [4000, "这分，都市传说都不敢写"],
    [3200, "人类已经拦不住你了"],
    [2500, "建议出道，别浪费这根手指"],
    [1800, "缝隙见你都往旁边让"],
    [1300, "这手速可以发朋友圈了"],
    [950, "有点东西，好友可能还笑得出来"],
    [700, "再来一局，刚才那下不算"],
    [480, "刚离开安全区，墙壁先打了招呼"],
    [0, "安全区一出来就撞上了"],
  ];

  OTE.dateKey = function dateKey(date) {
    const d = date || new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return String(d.getFullYear()) + month + day;
  };

  OTE.formatSeed = function formatSeed(seedKey) {
    return seedKey.slice(0, 4) + "-" + seedKey.slice(4, 6) + "-" + seedKey.slice(6, 8);
  };

  OTE.roastFor = function roastFor(score) {
    for (let i = 0; i < TIERS.length; i += 1) {
      if (score >= TIERS[i][0]) return TIERS[i][1];
    }
    return TIERS[TIERS.length - 1][1];
  };

  OTE.readChallenge = function readChallenge() {
    const params = new URLSearchParams(root.location.search);
    const today = OTE.dateKey();
    const rawDay = params.get("d");
    const seedKey = rawDay && /^\d{8}$/.test(rawDay) ? rawDay : today;
    const rawScore = params.get("c");
    const friend = rawScore && /^\d{1,6}$/.test(rawScore) ? Number(rawScore) : null;
    return {
      today: today,
      seedKey: seedKey,
      friend: friend,
      isToday: seedKey === today,
    };
  };

  OTE.challengeUrl = function challengeUrl(score, seedKey) {
    const url = new URL(root.location.href);
    url.hash = "";
    url.search = "";
    url.searchParams.set("c", String(score));
    url.searchParams.set("d", seedKey);
    return url.toString();
  };

  OTE.shareText = function shareText(score, roast) {
    return "我在「一指逃生」拿了 " + score + " 分。" + roast + " 你能超过我吗？";
  };

  OTE.friendLine = function friendLine(score, friend) {
    if (friend == null) return "";
    if (score > friend) return "超过好友的 " + friend + " 分了";
    if (score === friend) return "和好友打平，再来一把";
    return "还差 " + (friend - score) + " 分就能超过好友";
  };
})(window);
