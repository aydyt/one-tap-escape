(function (root) {
  "use strict";
  const OTE = (root.OTE = root.OTE || {});
  OTE.WORLD_W = 100;
  OTE.LANES = [26, 74];
  OTE.PLAYER_R = 6.05;
  OTE.BASE_SPEED = 46;
  OTE.MAX_SPEED = 230;
  OTE.MOVE_SPEED = 280;
  OTE.GRACE_SECONDS = 8;
  OTE.GRACE_Y = OTE.BASE_SPEED * OTE.GRACE_SECONDS;
  OTE.ANCHOR = 0.36;
})(window);
