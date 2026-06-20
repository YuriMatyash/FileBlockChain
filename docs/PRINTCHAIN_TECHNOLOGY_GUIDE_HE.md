# מדריך טכנולוגיות ומושגים בפרויקט PrintChain

> מדריך לימודי למתחילים. המטרה היא להבין את הטכנולוגיות, המושגים והארכיטקטורה של PrintChain לפני הצגת הפרויקט. המדריך מתייחס למימוש בפועל בקבצי הפרויקט, ומסמן בבירור מה אמיתי ברשת מקומית ומה מוק/דמו.

## 1. מבוא כללי

**PrintChain** הוא פרויקט DApp חינוכי לשוק רישיונות לקבצי ייצור דיגיטליים. דוגמאות לקבצים כאלה הן STL, STEP, 3MF, G-code, קבצי CNC, ZIP, PDF, שרטוטים טכניים ותמונות תצוגה מקדימה.

הרעיון המרכזי: יוצר מעלה או מזין קובץ ייצור ומטא־דאטה, מטביע NFT שמייצג **רישיון להשתמש, להדפיס או לייצר את המודל/הקובץ הדיגיטלי**, ומוכר את הרישיון דרך Marketplace. הקונה מקבל את ה-NFT, והחוזים שומרים היסטוריית בעלות, מחירים ותאריכים.

### למה זה DApp?

DApp הוא קיצור של Decentralized Application — אפליקציה מבוזרת. בפרויקט רגיל, רוב הלוגיקה והנתונים נמצאים בשרת מרכזי. בפרויקט DApp, חלק חשוב מהלוגיקה נמצא בחוזים חכמים (Smart Contracts) על גבי Blockchain.

ב-PrintChain:

- החוזים החכמים שומרים בעלות, היסטוריה, תאריכים ותמלוגים.
- המשתמש חותם עסקאות דרך MetaMask.
- ה-Frontend קורא וכותב לחוזים דרך `web3.js`.
- הקבצים עצמם לא נשמרים בבלוקצ'יין; נשמרים רק מזהים כמו CID.

### איזו בעיה הפרויקט פותר?

קבצי ייצור דיגיטליים קלים להעתקה. PrintChain מדגים דרך לנהל **רישיונות שימוש** לקבצים כאלה:

- מי היוצר המקורי?
- מי הבעלים הנוכחי של הרישיון?
- מתי הרישיון נוצר ונמכר?
- באיזה מחיר הוא נמכר?
- איך מבטיחים שיוצר מקבל 10% במכירה דרך המרקטפלייס?

### ההבדל בין Web App רגיל לבין DApp

| נושא | Web App רגיל | DApp כמו PrintChain |
|---|---|---|
| איפה הנתונים החשובים נשמרים? | במסד נתונים של שרת | בחוזים על רשת Blockchain מקומית |
| מי מאשר פעולה כספית? | השרת או מערכת תשלומים | המשתמש דרך MetaMask |
| האם אפשר לקרוא היסטוריה מהחוזה? | בדרך כלל תלוי בשרת | כן, היסטוריה נשמרת בחוזה |
| האם צריך Wallet? | לא תמיד | כן, כדי לחתום עסקאות |
| האם יש Gas? | לא | כן, בעסקאות כתיבה לבלוקצ'יין |

## 2. תמונת מערכת כללית

PrintChain בנוי מכמה חלקים שעובדים יחד:

1. **Smart Contracts** — חוזים ב-Solidity שמנהלים טוקנים, NFT, Marketplace ותמלוגים.
2. **Hardhat local blockchain** — רשת Ethereum מקומית לצורכי פיתוח ובדיקות.
3. **MetaMask wallet** — ארנק בדפדפן שמחזיק חשבונות וחותם עסקאות.
4. **React/Vite frontend** — ממשק המשתמש בדפדפן.
5. **web3.js** — ספרייה שמחברת בין ה-Frontend, MetaMask והחוזים.
6. **Express backend** — שרת קטן שמדגים HTTP 402 / x402-style route.
7. **Mock IPFS upload/metadata** — מצב דמו שמייצר CIDs מסוג `mock-*` אם אין שירות IPFS אמיתי.
8. **Mock x402 protected route** — route שמחזיר 402 בלי הוכחת תשלום מוק, ו-200 עם header דמו.

### תרשים תקשורת פשוט

```text
User → MetaMask → Frontend React/Vite → web3.js → Smart Contracts → Hardhat blockchain

Frontend → Backend Express → HTTP 402 / x402 demo

Frontend → Mock/IPFS metadata adapter → CID / TokenURI → PrintLicenseNFT
```

### איך החלקים מתקשרים בפועל?

- המשתמש פותח את האתר ומתחבר עם MetaMask.
- ה-Frontend קורא את כתובות החוזים מתוך `frontend/src/config/contracts.json` שנוצר אחרי deploy מקומי.
- `web3.js` משתמש ב-ABI ובכתובת החוזה כדי לקרוא פונקציות או לשלוח עסקאות.
- MetaMask מציג חלון אישור כאשר צריך לשלוח עסקה.
- החוזים רצים על Hardhat local blockchain.
- ה-Backend רץ בנפרד על `http://127.0.0.1:4000` ומשמש לדמו x402.
- במצב IPFS דמו, ה-Frontend מייצר CID מקומי ולא באמת מעלה ל-IPFS.

## 3. Blockchain basics

### מה זה Blockchain?

Blockchain הוא יומן נתונים שמורכב מבלוקים. כל בלוק מכיל עסקאות, וכל בלוק מחובר לבלוק שלפניו. הרעיון הוא שקשה לשנות היסטוריה שכבר נכתבה.

בפרויקט הזה ה-Blockchain הוא לא רשת ציבורית אמיתית, אלא **רשת Hardhat מקומית** שרצה על המחשב לצורכי לימוד.

### מה זה Ethereum / EVM?

Ethereum היא רשת Blockchain שמאפשרת להריץ חוזים חכמים. EVM הוא Ethereum Virtual Machine — "המחשב הווירטואלי" שמריץ את החוזים.

Hardhat מדמה רשת Ethereum מקומית שתומכת ב-EVM, ולכן אפשר להריץ עליה חוזי Solidity.

### מה זו עסקה (Transaction)?

עסקה היא פעולה שנשלחת לרשת ומשנה מצב. לדוגמה:

- mint NFT חדש.
- list NFT למכירה.
- buy NFT.
- cancel listing.
- mint PRINT reward.

עסקה דורשת חתימה מארנק ודורשת Gas.

### מה זה Gas?

Gas הוא התשלום על חישוב ואחסון ב-Ethereum. ברשת אמיתית משלמים Gas ב-ETH אמיתי. ברשת Hardhat מקומית משתמשים ב-ETH דמיוני ללא ערך כספי.

חשוב להבדיל בין:

- **מחיר Listing או Purchase** — למשל 1 ETH עבור NFT.
- **Gas fee** — עמלה קטנה על עצם ביצוע העסקה.

### מה זה ארנק (Wallet)?

ארנק הוא כלי שמחזיק חשבונות וחותם פעולות. MetaMask הוא ארנק דפדפן נפוץ. הארנק לא "שומר מטבעות" כמו קובץ פיזי; הוא מחזיק מפתח פרטי שמאפשר לשלוט בכתובת Blockchain.

### מה זה מפתח פרטי (Private Key)?

Private Key הוא סוד שמאפשר לחתום עסקאות. מי שמחזיק את המפתח הפרטי שולט בחשבון. אסור לשתף Private Key אמיתי.

ב-Hardhat יש מפתחות פרטיים ציבוריים שמופיעים בטרמינל. הם בטוחים **רק ברשת המקומית**. אסור להשתמש בהם ברשת אמיתית כמו mainnet או Sepolia עם כסף אמיתי, כי כולם מכירים אותם.

### מה זו כתובת (Address)?

Address היא מזהה ציבורי של חשבון או חוזה. לדוגמה, חשבון Hardhat ראשון נפוץ הוא:

```text
0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
```

### מה זו רשת Hardhat מקומית?

Hardhat local network היא Blockchain שרץ מקומית במחשב בזמן הפיתוח. מריצים אותה עם:

```bash
npx hardhat node
```

Hardhat פותח חשבונות בדיקה עם 10000 ETH דמיוני לכל חשבון כדי שיהיה קל לבדוק עסקאות בלי כסף אמיתי.

### ETH מקומי לעומת ETH אמיתי

| סוג ETH | איפה נמצא? | ערך כספי? | שימוש |
|---|---|---|---|
| Local Hardhat ETH | במחשב המקומי | אין ערך | פיתוח, בדיקות, דמו |
| Real ETH | Ethereum mainnet | יש ערך אמיתי | עסקאות אמיתיות |
| Sepolia ETH | Testnet ציבורי | בדרך כלל ללא ערך מסחרי, אך מוגבל | בדיקות ציבוריות |

הפרויקט הזה מיועד לרשת Hardhat מקומית בלבד במסגרת הדמו.

## 4. Smart contracts

### מה זה חוזה חכם (Smart Contract)?

חוזה חכם הוא תוכנית שרצה על Blockchain. במקום שהשרת יחליט מי הבעלים או כמה כסף להעביר, החוזה מגדיר כללים קבועים.

ב-PrintChain החוזים מנהלים:

- טוקן ERC20 בשם PRINT.
- NFT רישיונות ייצור/שימוש.
- Marketplace למכירה וקנייה.
- תמלוג 10% ליוצר במכירה דרך המרקטפלייס.
- היסטוריית בעלות ותאריכים.

### מה זה Solidity?

Solidity היא שפת תכנות לכתיבת חוזים חכמים ל-Ethereum/EVM. קבצי Solidity מסתיימים ב-`.sol`.

קבצים מרכזיים בפרויקט:

- `contracts/PrintToken.sol`
- `contracts/PrintLicenseNFT.sol`
- `contracts/PrintMarketplace.sol`

### מה זה Deployment?

Deployment הוא תהליך פריסת חוזה ל-Blockchain. אחרי deployment, החוזה מקבל כתובת משלו. ה-Frontend צריך לדעת את הכתובות כדי לדבר עם החוזים.

בפרויקט מריצים:

```bash
npm run deploy:local
```

הסקריפט פורס את החוזים לרשת Hardhat המקומית וכותב קובץ config ל-Frontend.

### מה זה ABI?

ABI הוא Application Binary Interface. זהו תיאור של פונקציות ואירועים בחוזה. ה-Frontend משתמש ב-ABI כדי לדעת איך לקרוא לפונקציות כמו `ownerOf`, `mintLicense`, `listLicense` או `buyLicense`.

### קריאה לעומת עסקה

יש שני סוגי אינטראקציה עם חוזה:

| פעולה | מה היא עושה? | Gas? | דוגמה |
|---|---|---|---|
| Read / call | קוראת מידע בלי לשנות מצב | לא | `ownerOf(tokenId)`, `getActiveListings()` |
| Write / transaction | משנה מצב בבלוקצ'יין | כן | `mintLicense`, `listLicense`, `buyLicense` |

קריאות חינמיות כי הן לא משנות את הבלוקצ'יין. עסקאות כתיבה דורשות Gas כי הן נרשמות בבלוקצ'יין.

## 5. ERC20 and PRINT token

### מה זה ERC20?

ERC20 הוא תקן לטוקנים ניתנים להחלפה (Fungible Tokens). ניתנים להחלפה פירושו שכל יחידה זהה לאחרת. לדוגמה: 1 PRINT של משתמש א' שווה ל-1 PRINT של משתמש ב'.

### מה זה PRINT בפרויקט?

`PrintToken` הוא ERC20 בשם `PrintToken` עם סימול `PRINT`. הוא משמש כטוקן תגמול ולימוד, לא כמטבע התשלום המרכזי במרקטפלייס.

בפרויקט:

- קניות Marketplace נעשות ב-ETH מקומי.
- PRINT משמש להצגת ERC20 ותגמולים.
- `mintReward(address to, uint256 amount)` מאפשר לבעל החוזה להטביע תגמול.

### למה PRINT אינו מטבע הרכישה?

כדי לפשט את הדמו, רכישות NFT נעשות ב-ETH דרך `PrintMarketplace`. PRINT נשאר טוקן reward/loyalty. זה מאפשר להראות גם ERC20 וגם מכירה ב-ETH בלי לסבך את תהליך הרכישה.

### מושגים חשובים ב-ERC20

- **Minting** — יצירת טוקנים חדשים.
- **Transfer** — העברה ממשתמש למשתמש.
- **balanceOf** — בדיקת יתרה של כתובת.
- **initial supply** — כמות ראשונית שנוצרת בזמן deploy.

### איפה זה נמצא בקוד?

- חוזה: `contracts/PrintToken.sol`
- פונקציה: `mintReward`
- בדיקות: `test/PrintToken.test.js`
- תצוגת יתרה ב-Frontend: `frontend/src/main.jsx`, באזור Rewards / Token Info.

## 6. NFT, ERC721, and license NFTs

### מה זה NFT?

NFT הוא Non-Fungible Token — טוקן ייחודי. בניגוד ל-ERC20, כל NFT שונה מאחרים. אם ERC20 דומה למטבעות זהים, ERC721 דומה לתעודות ייחודיות.

### ההבדל בין ERC20 ל-ERC721

| נושא | ERC20 | ERC721 / NFT |
|---|---|---|
| האם היחידות זהות? | כן | לא, כל token ייחודי |
| דוגמה בפרויקט | PRINT | PrintLicenseNFT |
| מזהה יחידה | balance בכמות | `tokenId` |
| שימוש | תגמולים | רישיון לקובץ ייצור |

### למה NFT הוא רישיון?

ב-PrintChain לא אומרים שה-NFT הוא "הקובץ עצמו". ה-NFT מייצג רישיון להשתמש, להדפיס או לייצר את המודל/הקובץ הדיגיטלי. זה חשוב כי קבצים דיגיטליים יכולים להיות מועתקים, אבל הרישיון וההיסטוריה מנוהלים בחוזה.

### מה זה tokenId?

`tokenId` הוא מספר ייחודי של NFT. לדוגמה, הרישיון הראשון יכול להיות `tokenId = 1`.

### מה זה TokenURI?

`tokenURI` הוא קישור למטא־דאטה של ה-NFT. בדרך כלל הוא נראה כך:

```text
ipfs://bafy...
```

או בדמו המקומי:

```text
ipfs://mock-...
```

### מה זה Metadata?

Metadata הוא JSON שמתאר את ה-NFT: שם, תיאור, תמונה, attributes, סוג קובץ, קטגוריה ועוד. ה-Blockchain לא שומר את כל התוכן הגדול, אלא שומר URI/CID שמצביע אליו.

### מה נשמר on-chain ומה off-chain/mock?

| מידע | נשמר בחוזה? | הערה |
|---|---|---|
| tokenId | כן | מזהה NFT |
| creator | כן | יוצר מקורי |
| current owner | כן, דרך ERC721 | `ownerOf` |
| title/description | כן, בצורה בסיסית | בפרטי license |
| fileCid | כן | מזהה קובץ, לא הקובץ עצמו |
| metadataCid | כן | מזהה metadata |
| קובץ STL/STEP עצמו | לא | אמור להיות ב-IPFS או מוק בדמו |
| preview image | לא ישירות | CID/URI במטא־דאטה |

החוזה שמיישם את ה-NFT הוא `contracts/PrintLicenseNFT.sol`.

## 7. Ownership, history, and timestamps

### מה זה ownerOf?

`ownerOf(tokenId)` היא פונקציית ERC721 שמחזירה מי הבעלים הנוכחי של NFT מסוים.

### למה לשמור היסטוריית בעלות?

דרישת הקורס כוללת NFT עם זיכרון של בעלים והיסטוריה מצטברת. לכן PrintChain לא מסתפק רק בבעלים הנוכחי. הוא שומר רשומות היסטוריה.

כל רשומה כוללת:

- `previousOwner`
- `newOwner`
- `price`
- `timestamp`
- `actionType`

### מה זה MINT ומה זה SALE?

- `MINT` — רשומה שנוצרת כאשר NFT חדש מוטבע. הבעלים הקודם הוא כתובת אפס, והבעלים החדש הוא היוצר.
- `SALE` — רשומה שנוצרת כאשר NFT נמכר דרך `PrintMarketplace`.

### מה זה timestamp?

Timestamp הוא זמן שנשמר בחוזה לפי `block.timestamp`. הוא מאפשר לדעת מתי פעולה קרתה.

### למה תאריכים חשובים?

כי הם מאפשרים להראות:

- מתי הרישיון נוצר.
- מתי הוא נמכר.
- מתי השתנתה בעלות.
- רצף היסטורי של פעולות.

### איך זה מוצג בממשק?

ה-Frontend קורא את `getOwnershipHistory(tokenId)` ומציג את ההיסטוריה באזור Details/History. הוא גם מציג רשימות כמו:

- **My Owned Licenses** — רישיונות שהחשבון המחובר מחזיק כרגע.
- **Created & Sold Licenses** — רישיונות שהחשבון יצר בעבר אבל כבר אינם בבעלותו.

### למה יוצר יכול לא להיות הבעלים?

אם היוצר מכר את ה-NFT, הבעלים החדש הוא הקונה. אבל היוצר עדיין רשום בחוזה כ-`creator`, ולכן אפשר להמשיך לעקוב אחרי רישיונות שהוא יצר ולקבל תמלוג במכירה דרך המרקטפלייס.

## 8. Marketplace and ETH purchase flow

### מה עושה Marketplace contract?

`PrintMarketplace` הוא חוזה שמנהל מכירות NFT:

- יצירת listing.
- ביטול listing.
- קנייה ב-ETH.
- העברת NFT לקונה.
- חלוקת תשלום בין יוצר למוכר.
- הסרת listing אחרי מכירה.

### מה זה Listing?

Listing הוא הצעה למכירה: tokenId, מוכר, מחיר, זמן יצירה וסטטוס active.

פונקציה מרכזית:

```text
listLicense(tokenId, price)
```

כאשר בעל NFT עושה listing, זו עסקת כתיבה ולכן MetaMask מבקש אישור וגז.

### מחיר listing לעומת gas fee

- **Listing price** — המחיר שהקונה ישלם עבור הרישיון, למשל 1 ETH.
- **Gas fee** — עלות קטנה לביצוע פעולה בבלוקצ'יין, למשל יצירת listing.

גם אם רק מפרסמים listing ולא קונים, עדיין צריך gas כי מצב החוזה משתנה.

### מה זה cancel listing?

`cancelListing(tokenId)` מבטל הצעה פעילה. רק המוכר שיצר את ה-listing יכול לבטל אותה.

### מה זה buy?

`buyLicense(tokenId)` קונה listing פעיל. הקונה שולח ETH בדיוק בגובה המחיר. החוזה מעביר NFT לקונה ומחלק את הכסף.

### למה MetaMask מבקש אישור?

כי פעולות כמו list/cancel/buy משנות מצב בבלוקצ'יין. MetaMask מבקש מהמשתמש לאשר את העסקה ולחתום עליה.

### למה היוצר/מוכר עשויים לקבל ETH כהעברה פנימית?

כאשר `buyLicense` מתבצעת, העסקה החיצונית היא מהקונה לחוזה המרקטפלייס. בתוך אותה עסקה החוזה שולח ETH ליוצר ולמוכר. MetaMask Activity לא תמיד מציג internal transfers בצורה ברורה, לכן עדיף לבדוק יתרות או בדיקות אוטומטיות.

פונקציות חשובות:

- `listLicense`
- `cancelListing`
- `buyLicense`
- `getActiveListings`
- `getListing`

## 9. 10% creator royalty

### מה דרישת הקורס?

הדרישה אומרת שמעבר מבעלות אחת לשנייה, במיוחד resale, צריך לשלוח 10% ליוצר המקורי.

### איך PrintMarketplace אוכף את זה?

ב-`buyLicense`, החוזה מחשב:

```text
royaltyAmount = price * 10%
sellerAmount = price - royaltyAmount
```

במימוש בפועל הערכים מוגדרים בבסיס נקודות (Basis Points):

- `ROYALTY_BASIS_POINTS = 1000`
- `BASIS_POINTS = 10000`

כלומר 1000/10000 = 10%.

### למי הכסף הולך?

- 10% הולך ל-`creator` המקורי של הרישיון.
- 90% הולך ל-`seller`, כלומר הבעלים הנוכחי שמוכר.

לדוגמה, אם מחיר resale הוא 2 ETH:

- היוצר המקורי מקבל 0.2 ETH.
- המוכר הנוכחי מקבל 1.8 ETH.

### למה זה נעשה במרקטפלייס?

ERC721 רגיל לא מכריח תמלוגים בכל העברה. לכן PrintChain מגביל העברות רגילות ומכריח מכירות לעבור דרך `PrintMarketplace`, שם אפשר לאכוף את חלוקת התשלום.

### למה direct wallet-to-wallet transfers מוגבלים?

אם משתמשים היו יכולים להעביר NFT ישירות בין ארנקים, אפשר היה לעקוף תמלוגים והיסטוריית מכירה. לכן החוזה מגביל העברות רגילות ומאפשר העברות דרך controller/marketplace.

### איך מוכיחים שהתמלוג עובד?

אפשר להוכיח בשלוש דרכים:

1. **Balance changes** — בודקים יתרות לפני ואחרי resale.
2. **Tests** — `test/PrintMarketplace.test.js` כולל בדיקה של 10% ליוצר ו-90% למוכר.
3. **Ownership/sale history** — אחרי מכירה יש רשומת `SALE` בהיסטוריה.

### ומה עם ERC2981?

ERC2981 הוא תקן שמאפשר לחוזה NFT לחשוף מידע על royalty דרך `royaltyInfo`. דרישת הקורס בעברית מתמקדת בכך שבמעבר בעלות 10% יעבור ליוצר. בפרויקט זה המנגנון העיקרי הוא **marketplace-enforced royalty**. לכן גם אם ERC2981 אינו המנגנון המרכזי כאן, התמלוג נאכף במרקטפלייס המקומי.

## 10. IPFS, files, metadata, and CID

### מה זה IPFS?

IPFS הוא מערכת אחסון מבוזרת לקבצים. במקום לשמור קובץ לפי כתובת שרת, IPFS מזהה קובץ לפי התוכן שלו.

### למה IPFS שימושי ל-NFT?

קבצי NFT יכולים להיות גדולים: תמונות, מודלים, מסמכים וקבצי ייצור. יקר ולא מתאים לשמור אותם בתוך Blockchain. לכן מקובל לשמור את הקובץ ב-IPFS ואת ה-CID בחוזה.

### מה זה CID?

CID הוא Content Identifier — מזהה תוכן. אם התוכן משתנה, ה-CID משתנה. זה עוזר לוודא שהקישור מתייחס לתוכן מסוים.

### מה זה ipfs://?

`ipfs://CID` הוא URI שמצביע לתוכן ב-IPFS. דפדפנים רגילים לא תמיד פותחים אותו ישירות, ולכן משתמשים לפעמים ב-gateway כמו:

```text
https://ipfs.io/ipfs/CID
```

### סוגי CID בפרויקט

- **file CID** — מזהה קובץ הייצור עצמו.
- **metadata CID** — מזהה קובץ JSON שמתאר את ה-NFT.
- **preview CID** — מזהה תמונת preview או render, אם יש.

### מה metadata JSON כולל בדרך כלל?

- `name`
- `description`
- `image`
- `attributes`
- `fileCid`
- `category`
- `file type`
- תיעוד או compatibility אם היוצר הזין.

### מה הפרויקט עושה בפועל?

הפרויקט כולל adapter ב-`frontend/src/ipfs/uploadAdapter.js`.

במצב ברירת מחדל מקומי:

- לא מתבצעת העלאה אמיתית ל-IPFS.
- נוצר CID דמו מסוג `mock-*`.
- מטא־דאטה קלה נשמרת ב-`sessionStorage` בדפדפן.
- קבצי preview גדולים לא נשמרים לצמיתות בדפדפן.

אם מוגדר endpoint אמיתי דרך משתני סביבה, אפשר לחבר שירות IPFS אמיתי, אבל בפרויקט לא נשמרים מפתחות אמיתיים ולא צריך להוסיף סודות.

## 11. MetaMask

### מה זה MetaMask?

MetaMask הוא ארנק דפדפן שמאפשר להתחבר לאפליקציות Web3, להחזיק חשבונות, ולחתום עסקאות.

### למה PrintChain צריך MetaMask?

כי פעולות כמו mint, list, cancel ו-buy הן עסקאות Blockchain. המשתמש צריך לאשר אותן בארנק.

### חיבור ל-Hardhat localhost

בהדגמה מוסיפים ל-MetaMask רשת:

- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency: `ETH`

### למה מייבאים חשבונות Hardhat?

כדי להשתמש באותם חשבונות שהרשת המקומית פתחה. החשבונות מקבלים 10000 ETH דמיוני, ולכן אפשר לבדוק רכישות ו-gas בלי כסף אמיתי.

### מה קורה כשמאשרים עסקה?

MetaMask מציג:

- איזה חשבון שולח.
- לאיזה חוזה או כתובת.
- כמה ETH נשלח, אם בכלל.
- הערכת gas.

אחרי אישור, העסקה נשלחת לרשת Hardhat המקומית.

### תפקידי חשבונות בדמו

- Account #0 — deployer / contract owner.
- Account #1 — creator / seller.
- Account #2 — buyer.
- Account #3 — resale buyer.

### למה MetaMask לא תמיד מציג royalty?

התמלוג ליוצר נשלח כהעברה פנימית מתוך החוזה בזמן `buyLicense`. MetaMask Activity יכול להציג בעיקר את העסקה הראשית ולא כל internal transfer. לכן מאמתים דרך יתרות, tests או אירועים/היסטוריה.

## 12. web3.js

### מה זה web3.js?

`web3.js` היא ספריית JavaScript שמאפשרת ל-Frontend לדבר עם Ethereum-compatible blockchain דרך provider כמו MetaMask.

### למה הפרויקט משתמש ב-web3.js?

דרישת הפרויקט היא להשתמש ב-`web3.js` ב-Frontend. לכן `frontend/src/main.jsx` מייבא:

```text
Web3 from "web3"
```

ומשתמש ב-`new web3.eth.Contract(abi, address)` כדי ליצור אובייקטי חוזה.

### איך web3.js מדבר עם MetaMask?

MetaMask חושף בדפדפן אובייקט בשם `window.ethereum`. ה-Frontend יוצר Web3 עם provider זה. כאשר צריך לשלוח עסקה, MetaMask מבקש אישור מהמשתמש.

### ABI + address

כדי לדבר עם חוזה צריך:

- ABI — אילו פונקציות ואירועים קיימים.
- Address — איפה החוזה נמצא ברשת.

הקובץ `frontend/src/config/contracts.json` מכיל את הכתובות וה-ABI אחרי deploy מקומי.

### call() לעומת send()

| web3.js | שימוש | דוגמה |
|---|---|---|
| `.call()` | קריאה חינמית שלא משנה מצב | לקרוא active listings או owner |
| `.send()` | עסקה שדורשת MetaMask וגז | mint, list, buy |

### דוגמאות מהפרויקט

- קריאת active listings: `PrintMarketplace.methods.getActiveListings().call()`.
- קריאת מידע NFT: `getLicenseInfo`, `ownerOf`, `getOwnershipHistory`.
- שליחת עסקאות: `mintLicense`, `listLicense`, `cancelListing`, `buyLicense`.

## 13. Frontend: React and Vite

### מה זה React?

React היא ספריית JavaScript לבניית ממשקי משתמש. היא מאפשרת לבנות UI מרכיבים, לשמור state, ולעדכן מסך לפי נתונים.

### מה זה Vite?

Vite הוא כלי פיתוח ובנייה מהיר ל-Frontend. הוא מפעיל שרת dev ומייצר build production.

### למה משתמשים בהם?

- React מתאים לבניית DApp UI אינטראקטיבי.
- Vite מאפשר הרצה מהירה עם `npm run frontend` ובנייה עם `npm run build --prefix frontend`.

### מה ה-Frontend עושה?

ה-Frontend ב-`frontend/src/main.jsx` אחראי ל:

- חיבור MetaMask.
- בדיקת Chain ID.
- טעינת חוזים מתוך `contracts.json`.
- הצגת Marketplace listings.
- הצגת PRINT balance.
- Mint רישיון NFT חדש.
- העלאת דמו/Mock metadata.
- List / cancel listing.
- Buy license NFT.
- הצגת Details והיסטוריה.
- הצגת My Owned Licenses.
- הצגת Created & Sold Licenses.
- הפעלת x402 demo request מול ה-Backend.

### קבצים חשובים

- `frontend/src/main.jsx` — רוב לוגיקת הממשק וה-Web3.
- `frontend/src/ipfs/uploadAdapter.js` — mock/real upload adapter.
- `frontend/src/styles.css` — עיצוב.
- `frontend/package.json` — dependencies כמו React, Vite ו-web3.

## 14. Backend: Express server

### מה זה Backend?

Backend הוא שרת שמקבל בקשות HTTP ומחזיר תשובות. למרות ש-DApp משתמש בחוזים חכמים, עדיין לפעמים יש Backend לצרכים משלימים: API, העלאות, gating, previews או אינטגרציה עם שירותים.

### למה יש Backend בפרויקט DApp?

ב-PrintChain ה-Backend מדגים x402/HTTP 402. הוא לא מחליף את החוזים ולא מבצע רכישת NFT. הוא רק מדגים route מוגן.

### מה זה Express?

Express היא ספריית Node.js לבניית שרתי HTTP בצורה פשוטה.

### Routes בפרויקט

- `GET /health` — מחזיר שהשרת עובד.
- `GET /api/paid-preview/:tokenId` — route מוגן שמדגים HTTP 402.

### קבצים חשובים

- `backend/server.js` — מגדיר את שרת Express ואת routes.
- `backend/x402.js` — פונקציות עזר לבדיקת proof מוק ולהחזרת תשובות 402/200.

## 15. HTTP 402 and x402

### מה הם HTTP status codes?

כאשר דפדפן או `curl` שולחים בקשת HTTP, השרת מחזיר status code. לדוגמה:

- `200 OK` — הצלחה.
- `404 Not Found` — לא נמצא.
- `500 Internal Server Error` — שגיאת שרת.
- `402 Payment Required` — נדרש תשלום.

### מה זה HTTP 402 Payment Required?

402 הוא קוד HTTP שמיועד למצבים שבהם נדרש תשלום לפני גישה למשאב. במשך שנים הוא כמעט לא היה בשימוש רחב, אבל כיום יש ניסיונות להשתמש בו עבור תשלומים באינטרנט.

### מה זה x402 באופן רעיוני?

x402 הוא רעיון/פרוטוקול שמנסה להשתמש ב-HTTP 402 כדי לאפשר גישה בתשלום ל-API או תוכן. הרעיון: אם אין תשלום, השרת מחזיר 402 ומסביר איך לשלם; אחרי תשלום תקין, השרת מחזיר את התוכן.

### איך PrintChain מדגים את זה?

הפרויקט כולל route:

```text
GET /api/paid-preview/:tokenId
```

בלי הוכחת תשלום:

```bash
curl -i http://127.0.0.1:4000/api/paid-preview/1
```

השרת מחזיר HTTP 402.

עם header דמו:

```bash
curl -i -H "x-printchain-demo-payment: paid" http://127.0.0.1:4000/api/paid-preview/1
```

השרת מחזיר HTTP 200 ונתוני preview דמו.

### חשוב מאוד: זה מוק

ה-x402 בפרויקט הוא **mocked x402-style local demo**:

- אין סליקת תשלום אמיתית.
- אין אימות תשלום אמיתי.
- אין payment credentials.
- זה נפרד מרכישת NFT במרקטפלייס.
- רכישות NFT עדיין מתבצעות ב-ETH דרך `PrintMarketplace` ו-MetaMask.

## 16. Hardhat and local development

### מה זה Hardhat?

Hardhat הוא כלי פיתוח ל-Ethereum. הוא עוזר לקמפל חוזים, להריץ בדיקות, לפתוח רשת מקומית ולפרוס חוזים.

### למה משתמשים בו?

כי הוא מאפשר לבנות DApp בלי להשתמש בכסף אמיתי ובלי להסתכן ברשת ציבורית.

### פקודות חשובות

| פקודה | מה היא עושה? |
|---|---|
| `npm run compile` | מקמפלת חוזי Solidity |
| `npm test` | מריצה בדיקות חוזים |
| `npx hardhat node` | מפעילה Blockchain מקומי |
| `npm run deploy:local` | פורסת חוזים לרשת המקומית וכותבת config ל-Frontend |
| `npm run seed:local` | יוצרת נתוני דמו: PRINT reward, NFT, listing |
| `npm run backend` | מפעילה שרת Express |
| `npm run frontend` | מפעילה את אתר React/Vite |

### למה נוצרות כתובות חוזים מקומיות?

כל deploy יוצר חוזים חדשים עם כתובות חדשות. לכן צריך לעדכן את ה-Frontend. הסקריפט `deploy:local` כותב את `frontend/src/config/contracts.json`, וכך ה-Frontend יודע לאן לשלוח קריאות ועסקאות.

## 17. Tests

### למה Tests חשובים?

Tests עוזרים לוודא שהחוזים מתנהגים כפי שציפינו. בבלוקצ'יין קשה לתקן חוזים אחרי פריסה, ולכן חשוב לבדוק לפני.

### מה הפרויקט בודק?

בדיקות ERC20:

- שם הטוקן נכון.
- סימול הטוקן נכון.
- אספקה ראשונית קיימת.
- העברות עובדות.
- `mintReward` עובד לפי הרשאות.

בדיקות NFT:

- יוצר יכול להטביע license NFT.
- נשמר creator נכון.
- `tokenURI` נכון.
- timestamp נשמר.
- ownership history מתחיל ב-MINT.
- direct transfers מוגבלים.

בדיקות Marketplace:

- בעלים יכול לבצע listing.
- מי שאינו בעלים לא יכול לבצע listing.
- אפשר לבטל listing.
- קונה יכול לקנות ב-ETH.
- NFT עובר לקונה.
- 10% הולך ליוצר ו-90% למוכר ב-resale.
- היסטוריית SALE מתווספת.
- listing נמחק אחרי רכישה.

### מה פירוש “30 passing”?

כאשר רואים בתוצאות בדיקה `30 passing`, זה אומר ש-30 מקרי בדיקה עברו בהצלחה. המספר המדויק יכול להשתנות אם מוסיפים או מסירים בדיקות, אבל המשמעות היא שכל הבדיקות שהורצו עברו.

## 18. Real vs mocked in this project

| Component | Real local implementation? | Mock/demo? | Explanation |
|---|---|---|---|
| Smart contracts | כן | לא | חוזי Solidity נפרסים ל-Hardhat local blockchain |
| ERC20 PRINT | כן | לא | `PrintToken` הוא ERC20 אמיתי ברשת המקומית |
| ERC721 NFT | כן | לא | `PrintLicenseNFT` הוא NFT אמיתי ברשת המקומית |
| Marketplace | כן | לא | `PrintMarketplace` מבצע listing, cancel ו-buy |
| Royalties | כן, במרקטפלייס | לא | `buyLicense` מחלק 10% ליוצר ו-90% למוכר |
| Ownership history | כן | לא | נשמרת בחוזה כרשומות MINT/SALE |
| Timestamps | כן | לא | נשמרים עם `block.timestamp` |
| MetaMask transactions | כן | לא | המשתמש מאשר עסקאות ברשת Hardhat המקומית |
| IPFS upload/CIDs | חלקית | כן | נשמרים CIDs בחוזה, אבל ברירת המחדל יוצרת `mock-*` CIDs |
| x402 payment settlement | לא | כן | route מחזיר 402/200 לפי proof מוק, בלי סליקה אמיתית |
| Frontend | כן | לא | React/Vite app אמיתי מקומי |
| Backend | כן | הדמו שבו מוק | Express server אמיתי, אך x402 verification מוק |

## 19. Full demo flow explained

### פקודות דמו

```bash
npm install
```

מתקין dependencies של הפרויקט הראשי.

```bash
npm install --prefix frontend
```

מתקין dependencies של ה-Frontend.

```bash
npm install --prefix backend
```

מתקין dependencies של ה-Backend.

```bash
npx hardhat node
```

מפעיל Blockchain מקומי. להשאיר פתוח בטרמינל נפרד.

```bash
npm run deploy:local
```

פורס את `PrintToken`, `PrintLicenseNFT` ו-`PrintMarketplace`, מגדיר transfer controller, וכותב `contracts.json` ל-Frontend.

```bash
npm run seed:local
```

יוצר נתוני דמו: PRINT reward ליוצר, NFT דמו, CIDs דמיוניים ו-listing.

```bash
npm run backend
```

מפעיל את שרת Express עבור x402 demo.

```bash
npm run frontend
```

מפעיל את אתר React/Vite.

### מה לבדוק ב-UI?

1. להתחבר עם MetaMask לרשת `localhost:8545`, Chain ID `31337`.
2. לראות marketplace listing שנוצר ב-seed.
3. לפתוח פרטי NFT ולראות creator, owner, CID, timestamp והיסטוריה.
4. להטביע NFT חדש דרך Mint.
5. לראות את NFT ב-My Owned Licenses.
6. לבצע list למכירה.
7. לבצע cancel listing.
8. לבצע list מחדש.
9. לעבור לחשבון buyer ולקנות.
10. לבדוק שה-owner השתנה.
11. לבצע resale מחשבון buyer לקונה נוסף.
12. לאמת 10% royalty ליוצר המקורי.
13. לבדוק Created & Sold Licenses אצל היוצר.
14. לבדוק x402 ללא header ולקבל 402.
15. לבדוק x402 עם header ולקבל 200.

## 20. Glossary

| מושג | הסבר פשוט |
|---|---|
| DApp | אפליקציה שמחוברת לחוזים חכמים ב-Blockchain |
| Blockchain | יומן עסקאות מבוזר שמורכב מבלוקים |
| Ethereum | רשת Blockchain שמריצה חוזים חכמים |
| EVM | המכונה הווירטואלית שמריצה חוזי Ethereum |
| Smart contract | תוכנית שרצה על Blockchain ומנהלת כללים ונתונים |
| Solidity | שפת תכנות לחוזים חכמים ב-Ethereum |
| Hardhat | כלי פיתוח לקימפול, בדיקה ופריסה של חוזים |
| Gas | עמלת חישוב/אחסון עבור עסקה בבלוקצ'יין |
| Transaction | פעולה חתומה שמשנה מצב בבלוקצ'יין |
| Wallet | כלי שמחזיק חשבונות וחותם עסקאות |
| Address | כתובת ציבורית של חשבון או חוזה |
| Private key | סוד שמאפשר לשלוט בחשבון; אסור לשתף |
| MetaMask | ארנק דפדפן נפוץ ל-DApps |
| ERC20 | תקן לטוקנים זהים/ניתנים להחלפה |
| ERC721 | תקן לטוקנים ייחודיים, NFT |
| NFT | טוקן ייחודי שמייצג פריט או רישיון |
| Token ID | מזהה מספרי ייחודי של NFT |
| TokenURI | קישור למטא־דאטה של NFT |
| Metadata | נתוני תיאור כמו שם, תיאור, תמונה ו-attributes |
| IPFS | מערכת אחסון מבוזרת לקבצים |
| CID | מזהה תוכן ב-IPFS |
| Marketplace | חוזה/מערכת למכירה וקנייה של NFTs |
| Royalty | תמלוג ליוצר מקורי ממכירה |
| Creator | היוצר המקורי של הרישיון/NFT |
| Seller | הבעלים הנוכחי שמוכר NFT |
| Buyer | משתמש שקונה NFT |
| ABI | תיאור פונקציות ואירועים של חוזה עבור תוכנה חיצונית |
| web3.js | ספרייה שמחברת JavaScript ל-Ethereum/MetaMask |
| React | ספרייה לבניית ממשקי משתמש |
| Vite | כלי פיתוח ובנייה מהיר ל-Frontend |
| Backend | שרת שמספק API או לוגיקה משלימה |
| Express | ספריית Node.js לבניית שרת HTTP |
| HTTP | פרוטוקול בקשות/תשובות של האינטרנט |
| HTTP 402 | קוד סטטוס שמשמעותו Payment Required |
| x402 | רעיון/פרוטוקול לגישה בתשלום דרך HTTP 402 |
| Mock/demo | מימוש דמה ללימוד, לא מערכת production אמיתית |
| Localhost | המחשב המקומי, בדרך כלל `127.0.0.1` |
| Chain ID | מזהה רשת Blockchain, למשל 31337 ב-Hardhat |
| Sepolia/mainnet | Sepolia היא רשת בדיקה ציבורית; mainnet היא רשת אמיתית עם כסף אמיתי |

## 21. Final summary

אחרי קריאת המדריך, כדאי להבין ש-PrintChain הוא DApp לימודי שמחבר כמה טכנולוגיות:

- Solidity smart contracts מנהלים טוקנים, NFT, marketplace, היסטוריה ותמלוגים.
- Hardhat מספק רשת Blockchain מקומית ובטוחה ללימוד.
- MetaMask מאפשר למשתמש לחתום עסקאות.
- web3.js מאפשר ל-Frontend לדבר עם MetaMask והחוזים.
- React/Vite מספקים UI נוח לדמו.
- Express מספק route דמו ל-HTTP 402 / x402-style.
- IPFS מיוצג דרך CIDs, אך במצב המקומי ברירת המחדל היא mock/demo.

### מה לומר אם המרצה שואל?

**מה אמיתי?**

החוזים, ERC20, ERC721, Marketplace, העברת NFT, היסטוריית בעלות, timestamps ותמלוג 10% דרך המרקטפלייס אמיתיים ברשת Hardhat מקומית.

**מה מוק?**

IPFS במצב ברירת מחדל הוא mock CIDs, ו-x402 הוא mock payment proof. אין סליקה אמיתית ואין העלאת IPFS אמיתית אלא אם מחברים endpoint חיצוני.

**איך נאכף 10% royalty?**

דרך `PrintMarketplace.buyLicense`: החוזה מחשב 10% מהמחיר ליוצר המקורי ו-90% למוכר, ואז מעביר את ה-NFT לקונה ורושם היסטוריה.

**למה להשתמש ב-IPFS?**

כי קבצי ייצור גדולים לא מתאימים לאחסון ישיר בבלוקצ'יין. שומרים CID בחוזה והקובץ עצמו אמור להיות מחוץ לשרשרת.

**למה להשתמש ב-x402?**

כדי להדגים גישה בתשלום לתוכן או API. בפרויקט זה הדמו מראה 402 ללא proof ו-200 עם proof מוק.

**למה להשתמש ב-MetaMask?**

כי המשתמש צריך לחתום עסקאות Blockchain כמו mint, list ו-buy.

**למה להשתמש ב-web3.js?**

כי ה-Frontend צריך דרך לדבר עם MetaMask ועם החוזים באמצעות ABI וכתובות חוזים, ודרישת הפרויקט היא להשתמש ב-web3.js בצד הלקוח.

## נספח: יצירת PDF מקומית

בסביבת פיתוח שבה קיים Chrome/Chromium או `wkhtmltopdf`, אפשר להריץ:

```bash
npm run guide:technology
```

אם אין מנוע PDF מותקן, הסקריפט עדיין יוצר HTML קריא בנתיב:

```text
docs/PRINTCHAIN_TECHNOLOGY_GUIDE_HE.html
```

כדי ליצור PDF ידנית:

1. פתחו את קובץ ה-HTML בדפדפן Chrome.
2. בחרו Print.
3. בחרו Save as PDF.
4. שמרו בשם `docs/PRINTCHAIN_TECHNOLOGY_GUIDE_HE.pdf`.

אפשרות נוספת היא להתקין `chromium` או `wkhtmltopdf` ואז להריץ שוב `npm run guide:technology`.
