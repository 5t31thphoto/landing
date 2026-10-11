# BasaltSoftworks landing page: setup

## What's in the folder

```
index.html          the landing page
thanks.html         the thank-you page people land on after they tip
assets/             favicon set + mantis-astronaut.png
assets/mantis/      the Synapse mantis parts + mantis-rig.js (the animated mantis at the top)
assets/projects/    project graphics: pinball video, Synapse fractal, CsiRadar32 infographic, and more
```

## Put it online

This page lives in its own repo, separate from your project sites. Any repo name works. These steps use `basaltsoftworks`.

1. On GitHub, create a new repo named **`basaltsoftworks`**.
2. Upload `index.html`, `thanks.html` and the whole `assets/` folder to the root of the main branch.
3. Go to **Settings > Pages**. Set Source to **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute or two, the page is live at `https://5t31thphoto.github.io/basaltsoftworks/`. That's the link you share.

If you pick a different repo name, update two spots to match: the `og:image` line near the top of `index.html` (it's the preview image when you share the link), and the Stripe redirect URL below.

## Adding links later

Every link you'll ever need to change lives in one block near the bottom of `index.html`. Search for `LINKS YOU EDIT`.

```js
const AFFILIATE = {
  ...
  esp32cam:   "",   // ESP32-CAM bundle WITH the USB programmer base
  microsd:    "",   // optional: hidden until filled in
  usbc_cable: ""    // optional: hidden until filled in
};

const TIPS = {
  small:  "",   // $5 Stripe Payment Link
  medium: "",   // $15 Stripe Payment Link
  custom: ""    // pick-your-amount Stripe Payment Link
};
```

Paste a URL between the quotes, save, and upload the file again. That's it.

- **Empty ESP32-CAM link:** the Shop button shows "Link coming soon".
- **Empty microSD / cable links:** those rows stay hidden until you fill them in.
- **Empty tip links:** the tip cards stay hidden and a short "tips are opening soon" note shows instead.

### Making an Amazon affiliate link

Take any Amazon product link, find the 10-character product ID after `/dp/` (it starts with `B0`), and build:

```
https://www.amazon.com/dp/PRODUCTID/?tag=5t31th-20
```

The required Amazon disclosure ("As an Amazon Associate I earn from qualifying purchases.") is already on the page under the gear list. Leave it there.

## Project graphics

Every section has a graphic now. They all live in `assets/projects/`.

| Section | File | What it is |
| --- | --- | --- |
| MantisCryptoPinball | `pinball.webm`, `pinball.mp4`, `pinball-poster.webp` | the animation |
| Mantis Synapse | `synapse-fractal.js` | the fractal dive, running live |
| SpaceMantis | `spacemantis.png` | the astronaut mantis |
| MantisStudio | `studio.png` | drum pads and mixer, drawn from the firmware's own screen code |
| Mantis Chat | `chat.png` | stand-in graphic |
| MantisCalc | `calc.png` | the electrical page, from the calculator's `ui-preview.png` |
| CsiRadar32 | `csiradar.webp`, `csiradar-820.webp` | the infographic |
| Mantis Cam | `cam.png` | stand-in graphic |
| Device Radar | `deviceradar.png` | stand-in graphic |

To swap any PNG for a real screenshot later, save the new image over the old one with the same name. No code changes. Stand-in graphics show about 150 px tall; screenshots in MantisStudio and MantisCalc fill the card width.

## Setting up tips (Stripe Payment Links)

Each tip button is a Stripe Payment Link that sends people to `thanks.html` after they pay.

**Account (one time)**

1. Sign up at stripe.com. An individual / sole proprietor account is fine for a family team.
2. Add your bank account for payouts and verify your identity when asked.
3. In **Settings > Public details**, set the business name to `BasaltSoftworks` and the statement descriptor to `BASALTSOFTWORKS` so supporters recognize the charge.
4. Turn on **Settings > Customer emails > Successful payments** so supporters get a receipt automatically.

**What Test mode is (do this before making links)**

Test mode is a practice copy of your Stripe account. It looks the same, but every payment is pretend: no real card gets charged and no money moves. You use it to make sure the tip buttons work and land on your thank-you page before anyone pays for real.

To turn it on:

1. In the Stripe Dashboard, click your business name in the top-left corner.
2. Choose **Switch to sandbox > Test mode**. (On some accounts it's a **Test mode** switch in the top-right instead.)
3. You'll see a **Test mode** label across the Dashboard. Everything you create now is practice only.

Shortcut: `https://dashboard.stripe.com/test/dashboard` opens Test mode directly. To leave, open the same menu and choose **Exit test mode**.

Two things to know:

- **Test links don't carry over.** Anything you make in Test mode only exists in Test mode, so you'll make the three links twice: once to practice, once for real. Test links have `test_` in the address (`https://buy.stripe.com/test_...`), so you can always tell them apart.
- **Fake cards only.** In Test mode, use Stripe's test card `4242 4242 4242 4242`. A real card won't work there.

**The three links.** Make these in Test mode first.

| Button | Pricing type | Product name | Amount |
| --- | --- | --- | --- |
| Tip $5 | Products or subscriptions | Tip: a spool of solder | $5 one-time |
| Tip $15 | Products or subscriptions | Tip: a new dev board | $15 one-time |
| Choose an amount | Customers choose what to pay | Back the team | Suggested $10, minimum $2 |

For each one:

1. **Payment Links > + New**, pick the pricing type from the table.
2. Enter the name and amount. Leave quantity adjustment off.
3. Open the **After payment** tab, choose **Don't show confirmation page**, and enter
   `https://5t31thphoto.github.io/basaltsoftworks/thanks.html`
4. **Create link** and copy the URL (`https://buy.stripe.com/...`).

**Test, then go live**

1. Paste the three test links into `TIPS`, upload, and click each tip button on the live site.
2. Pay with test card `4242 4242 4242 4242`, any future date, any CVC, any ZIP.
3. Confirm you land on the thank-you page and the payment shows up in the Dashboard.
4. Leave Test mode (business name menu > **Exit test mode**), make the same three links again for real, paste those live links over the test ones, and upload again. Live links have no `test_` in the address.
5. Make one real $2 tip yourself, then refund it from the Dashboard.

Prefer something simpler? Paste a single Ko-fi link into all three `TIPS` slots. Supporters will see Ko-fi's thank-you instead of yours.

## Good to know

- **Tips, not donations.** Unless BasaltSoftworks is a registered nonprofit, tips aren't tax-deductible. The page already says this under the tip cards.
- **The thank-you page is public.** Anyone can open it directly, so never put a reward or download code on it.
- **Taxes.** Tips and affiliate income are taxable. Stripe and Amazon Associates both give you yearly reports. Save them with your other records.
