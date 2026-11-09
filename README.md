# Finances (version 3)

A private finance dashboard. Your laptop imports your bank exports and keeps one data file in your Google Drive. Your iPhone shows that file.

There's no server, no bank login and no AI involved in running it. The page is blocked from making any network request.

## How it fits together

- **Laptop (Chrome or Edge):** you import your CSV exports and make every change here. After each change the app saves everything to one file, `finances-data.json`, in your Google Drive folder.
- **iPhone:** view only. Tap **Load latest**, pick that file, and it shows the same numbers. It keeps showing them offline until you load a newer file.
- **GitHub Pages** hosts the app's code so both devices can open it. Your data never goes there.

## Set up once (about 15 minutes)

### 1. Put the app online

1. On github.com, create an account if you need one, then a new repository, for example `finances`. Public is fine: it holds the app and made-up demo data only.
2. **Add file → Upload files**. Drag in everything inside this folder, including the `icons` and `demo` folders. Click **Commit changes**.
3. **Settings → Pages**. Under Source choose **Deploy from a branch**, then branch `main`, folder `/ (root)`, then **Save**.
4. About a minute later the page shows your link: `https://<your-username>.github.io/finances/`.

Never upload `finances-setup.json`, `finances-data.json` or any CSV to the repository.

### 2. Laptop

1. Install **Google Drive for desktop** and sign in. It adds your Drive to File Explorer.
2. Open your link in Chrome or Edge, in a normal window (not Incognito or InPrivate), and bookmark it.
3. Bring your data in, one of two ways:
   - **From version 2:** open the old version, **Settings → Back up everything**. In the new one, **Settings → Restore a backup or setup file** and pick that file. Names, rules and every decision you made come across.
   - **Starting fresh:** click **Import files** and choose your HSBC, Amex and Revolut exports. Then **Settings → Restore a backup or setup file** and pick `finances-setup.json`.
4. Click **Link it** on the banner, then **Create the data file**. Save `finances-data.json` inside your Google Drive folder.
5. When Chrome asks to let the site edit the file, allow it. If it offers "Allow on every visit", choose that.
6. In **Settings → Your take-home pay**, type the net pay from a normal payslip.
7. Open **Review** and confirm the transfers with your sister.
8. Open **Check** and add two balances each for HSBC and Amex (see below).

### 3. iPhone

1. Install the **Google Drive** app and sign in.
2. Open your link in Safari. Tap **Share → Add to Home Screen**.
3. Open Finances from the Home Screen. Tap **Load latest → Browse → Google Drive → finances-data.json**.

If Google Drive isn't listed under Browse: open the Files app, tap Browse, tap the "…" button, choose Edit, and switch on Google Drive.

## Each month (about 10 minutes, on the laptop)

1. Export from the three accounts:
   - **HSBC:** online banking. Open the account, set the dates under *Search and filter*, click *Download* and choose CSV.
   - **Amex:** americanexpress.com → *Statements & Activity* → *Download* → CSV.
   - **Revolut:** in the app, open the account → *…* → *Statement* → *Excel*. Send the file to your laptop.
2. **Import files** and choose all three. Overlapping dates are fine: anything already imported is skipped.
3. Clear **Review**.
4. On **Check**, add this month's HSBC and Amex balances.
5. On the *Investments & pension* card, click **Update** and type the Trading 212 value. Type the L&G value whenever you check it.
6. On the iPhone, tap **Load latest**.

## How it counts your money

- **Transfers between your own accounts** aren't spending or income: HSBC paying Amex, topping up Revolut, money sent to Trading 212.
- **Bills you pay for your sister** (the payees in **Settings → Paid for your sister**) aren't your spending. Each payee shows what it matches, so a broad one like `ENERGY` is easy to spot.
- **Transfers between you and your sister** all go to **Review**. The app suggests "settling up" for £200 or more and ordinary spending or income for less, but nothing is final until you confirm it. Until then it's counted as suggested.
- **What she owes you** is a running total: bills you paid for her, plus settling-up money you sent, minus settling-up money she sent you.
- **Salary:** the app expects the take-home you typed. With nothing typed, it uses the middle of your last three pay days. A pay day more than 12% above that is split into salary and bonus.
- **Investments and pension** are the values you last typed in. There are no estimates.
- **What's counted:** on the overview, the arrow on *Left over* lists every line for the month, counted or not. Tap a line to see its transactions.

## Check: is the data right?

Between two balances, the transactions in between must add up to the change. If they do, nothing in that period is missing or doubled.

- **Revolut** is checked automatically from the Balance column of each statement.
- **HSBC:** online banking shows a running balance beside each transaction. Type the balance after the last transaction of a day, with that date.
- **Amex:** type the closing date and closing balance from two statements. A purchase from the last day or two of a statement can land in the next one, so a gap the size of one purchase is normal.

Check tells you the import is complete. It doesn't tell you each transaction is in the right category: that's what Review and "What's counted" are for.

## Privacy

- `index.html` sets a Content-Security-Policy with `connect-src 'none'`, so the app can't send your data anywhere.
- There are no third-party scripts, fonts or analytics.
- Your data is in the browser's storage on each device, and in `finances-data.json` in your Google Drive. Google holds that file like any other in your Drive.
- Keep `finances-data.json`, `finances-setup.json` and your CSVs out of the GitHub repository.

## If something goes wrong

- **"Reconnect data file" appears on the laptop:** click it and allow access. Chrome asks again after a restart unless you chose "Allow on every visit".
- **The laptop can't save to the Drive folder:** use **Settings → Download a copy** and drag that file into drive.google.com. The iPhone can load it the same way.
- **The iPhone says "Already up to date" after an import:** Google Drive hasn't synced yet. Wait a minute, or open the Drive app once, then try again.
- **The iPhone lost its data:** tap **Load latest** again. Nothing is lost, because the file is the master copy.
- **A new laptop or browser:** open the link, click **Open a data file** and pick `finances-data.json`.

## Updating the app

Replace the files in the repository. Your data stays where it is. The app offers **Reload** when the new version is ready.

## Limits

- It isn't live. It's as current as your last export.
- Only the laptop can import or change anything. The iPhone is view only.
- The laptop needs Chrome or Edge to keep the data file up to date by itself.
- Revolut gives one statement per currency. Lines not in pounds are listed in Review but not counted.
- PDF statements aren't supported.
- Trading 212 exports are optional. If you import one, dividends and interest are counted as income.

## Files

| File | What it does |
| --- | --- |
| `index.html`, `styles.css` | The page and its styling |
| `core.js` | Reads the exports, classifies transactions, does the sums and the balance check |
| `app.js` | The screens, and saving and loading the data file |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline use and the Home Screen icon |
| `demo.js`, `demo/` | Made-up sample data |
