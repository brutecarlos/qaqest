/**
 * Google AdSense configuration.
 *
 * Fill in your own publisher/client ID and ad slot IDs below once your
 * AdSense account is approved. Until "client" is replaced with a real
 * "ca-pub-..." value, QAQEST keeps rendering harmless placeholder boxes
 * instead of real ad units (see js/layout.js), so the site works fine
 * with or without AdSense configured.
 *
 * Where to get these values:
 *   1. Sign up / sign in at https://www.google.com/adsense
 *   2. Add this site's URL (e.g. https://<you>.github.io/qaqest/) and
 *      complete Google's site-ownership verification for it.
 *   3. Under Ads > By ad unit, create two ad units (or reuse one for
 *      both slots) and copy each unit's numeric "data-ad-slot" value.
 *   4. Copy your account-wide "client" ID (looks like "ca-pub-1234567890123456").
 *   5. Paste the values below, commit, and QAQEST will automatically start
 *      requesting real ads for visitors who opt in via the ads toggle.
 *
 * See README.md > "Connecting Google AdSense" for the full walkthrough,
 * including the ads.txt step.
 */
window.QAQEST_ADSENSE = {
  // Your AdSense publisher/client ID, e.g. "ca-pub-1234567890123456".
  client: "ca-pub-3540202863792769",

  // Ad unit ("data-ad-slot") IDs. Leave blank to keep placeholders; the
  // AdSense loader script still loads (enabling Auto ads, if turned on
  // in your AdSense dashboard) as soon as "client" above is set and a
  // visitor has opted into ads, even with no slot IDs configured here.
  slots: {
    header: "",
    inline: "",
  },
};
