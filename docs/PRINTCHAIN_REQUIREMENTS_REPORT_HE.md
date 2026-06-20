# דוח התאמת פרויקט PrintChain לדרישות קורס DApp

> דוח זה נכתב לאחר בדיקה של קבצי הפרויקט בפועל: `contracts/`, `scripts/`, `test/`, `frontend/`, `backend/`, `docs/`, `README.md` וקבצי `package.json`. הדוח מבחין בין מימוש אמיתי על רשת Hardhat מקומית לבין רכיבי דמו/מוק.

## 1. תקציר הפרויקט

**PrintChain** הוא פרויקט DApp חינוכי לשוק רישיונות דיגיטליים לקבצי ייצור: STL, STEP, 3MF, G-code, CNC, ZIP, PDF, שרטוטים טכניים ותצוגות מקדימות. הרעיון המרכזי הוא שיוצר מעלה קובץ ייצור ומטא־דאטה ל-IPFS או למצב דמו מקומי, מטביע NFT שמייצג רישיון שימוש/הדפסה/ייצור, ומוכר את הרישיון דרך חוזה Marketplace.

הפרויקט הוא DApp משום שהוא משלב:

- חוזים חכמים ב-Solidity שרצים על רשת Hardhat מקומית.
- ERC20 בשם `PrintToken` עם סימול `PRINT` לצבירת תגמולים.
- ERC721 בשם `PrintLicenseNFT` לרישיונות ייצור/שימוש.
- חוזה `PrintMarketplace` לקנייה ומכירה ב-ETH מקומי, כולל תמלוג של 10% ליוצר המקורי.
- ממשק React/Vite שמתחבר ל-MetaMask דרך `web3.js`.
- שרת Backend קטן שמדגים התנהגות HTTP 402 / x402-style.

הבעיה שהפרויקט פותר היא ניהול ומסחר ברישיונות שימוש לקבצי ייצור דיגיטליים, תוך שמירה על בעלות, היסטוריה, מחיר ותאריכים על גבי הבלוקצ'יין המקומי. חשוב: ה-NFT אינו מתואר רק כ"בעלות על STL", אלא כ-**רישיון להשתמש, להדפיס או לייצר את המודל/הקובץ הדיגיטלי**.

## 2. טבלת מיפוי דרישות הקורס

| דרישה | משמעות הדרישה | איך זה מיושם בפרויקט | קבצים/חוזים/פונקציות רלוונטיים | איך מדגימים בפועל | סטטוס |
|---|---|---|---|---|---|
| פרויקט DApp | אפליקציה מבוזרת עם חוזים חכמים וממשק משתמש | חוזי Solidity + Frontend React + MetaMask + Hardhat מקומי | `contracts/*.sol`, `frontend/src/main.jsx`, `hardhat.config.js` | מפעילים Hardhat, deploy, seed, frontend ומתחברים עם MetaMask | עומד |
| מטבע ERC20 | טוקן רגיל לפי תקן ERC20 | `PrintToken` יורש מ-OpenZeppelin `ERC20`, שם `PrintToken`, סימול `PRINT`, `mintReward` לבעלים | `contracts/PrintToken.sol`, `test/PrintToken.test.js` | בודקים שם/סימול/העברות/תגמול, רואים יתרת PRINT בממשק | עומד |
| מטבע NFT | טוקן ERC721 ייחודי | `PrintLicenseNFT` יורש מ-`ERC721URIStorage`; כל NFT הוא רישיון שימוש/ייצור | `contracts/PrintLicenseNFT.sol`, `mintLicense`, `tokenURI` | מטביעים רישיון חדש דרך UI או seed ורואים tokenId ופרטי רישיון | עומד |
| NFT עם זיכרון של בעלים | החוזה שומר היסטוריית בעלויות ולא רק בעלים נוכחי | מערך `OwnershipRecord[]` לכל token, כולל `previousOwner`, `newOwner`, מחיר, timestamp וסוג פעולה | `getOwnershipHistory`, `_recordOwnershipHistory`, `controlledTransferFrom` | במסך Details/My Licenses רואים היסטוריית MINT ו-SALE | עומד |
| מעבר בעלות מחייב 10% ליוצר | מכירה דרך marketplace מחלקת ETH: 10% ליוצר המקורי ו-90% למוכר | `buyLicense` מחשב `royaltyAmount = price * 1000 / 10000` ושולח ל-creator | `contracts/PrintMarketplace.sol`, `buyLicense`, `ROYALTY_BASIS_POINTS` | מבצעים resale ובודקים יתרות או מריצים test שמאמת 10%/90% | עומד במרקטפלייס המקומי |
| תאריכים בחוזים | שמירת timestamps בחוזה | שימוש ב-`block.timestamp` בעת mint, listing, sale/history | `createdAt`, `listedAt`, `OwnershipRecord.timestamp`, אירועים | רואים תאריך mint/list/sale בהיסטוריה ובפרטי NFT | עומד |
| צבירת היסטוריה | שמירת רשומות היסטוריות לאורך זמן | `OwnershipRecord[]` צובר MINT ו-SALE; כל רשומה כוללת גם price ולכן משמשת גם כהיסטוריית מחיר בסיסית | `getOwnershipHistory`, tests של marketplace | מבצעים כמה מכירות ורואים רשומות מצטברות | עומד חלקית: אין פונקציית `getPriceHistory` נפרדת |
| העלאת מסמכים ורישום IPFS | קובץ ומטא־דאטה נשמרים מחוץ לשרשרת, וה-CID נשמר בחוזה | החוזה שומר `fileCid`, `metadataCid`, `tokenURI`; frontend יוצר CID מוק במצב ברירת מחדל או משתמש endpoint חיצוני אם הוגדר | `mintLicense`, `frontend/src/ipfs/uploadAdapter.js` | מעלים קובץ דרך Mint; במצב מקומי מתקבל `mock-*` CID; עם endpoint אמיתי ניתן לקבל CID אמיתי | דמו/עומד חלקית |
| MetaMask | הפעלה מארנק דפדפן וחתימת עסקאות | frontend משתמש ב-`window.ethereum`, מבקש `eth_requestAccounts`, מצפה Chain ID 31337 | `frontend/src/main.jsx`, `connectWallet` | מוסיפים רשת localhost ל-MetaMask ומתחברים עם חשבונות Hardhat | עומד |
| חוזה יחסית מורכב | יותר מחוזה פשוט: אינטראקציה בין חוזים, הרשאות, היסטוריה ותמלוגים | ERC20 + ERC721 + Marketplace; restricted transfers; sale records; royalty split; active listings | `PrintToken.sol`, `PrintLicenseNFT.sol`, `PrintMarketplace.sol` | מריצים tests ו-demo flow | עומד |
| ממשק אינטרנטי | UI להצגת marketplace, mint, buying, history, rewards | React/Vite single-page app עם מסכים/אזורים ל-marketplace, mint, owned licenses, created/sold, rewards ו-x402 demo | `frontend/src/main.jsx`, `frontend/src/styles.css` | `npm run frontend`, כניסה לכתובת Vite | עומד |
| יישום web3.js | שימוש בספריית web3.js בצד הלקוח | frontend מייבא `Web3` מ-`web3` ובונה `new web3.eth.Contract` | `frontend/src/main.jsx`, `frontend/package.json` | פעולות קריאה וטרנזקציות מתבצעות דרך web3.js | עומד |
| יישום x402 | הדגמת HTTP 402 Payment Required | backend route מחזיר 402 בלי הוכחת תשלום מוק, ו-200 עם header `x-printchain-demo-payment: paid` | `backend/server.js`, `backend/x402.js` | `curl` ללא header מחזיר 402; עם header מחזיר 200 | דמו מוק, לא סליקה אמיתית |
| ERC2981 royalty support | חשיפת royalty info בתקן NFT royalties | בבדיקה הנוכחית לא נמצאו ירושה מ-`ERC2981` או פונקציית `royaltyInfo` ב-`PrintLicenseNFT` | `contracts/PrintLicenseNFT.sol` | אי אפשר להדגים `royaltyInfo` תקני בלי שינוי חוזה | חסר/עומד חלקית ביחס למסמך הפרויקט |

## 3. פירוט לפי דרישה

### ERC20: PrintToken / PRINT

הדרישה למטבע ERC20 ממומשת בחוזה `PrintToken`. החוזה יורש מ-OpenZeppelin `ERC20` ו-`Ownable`, מגדיר שם `PrintToken` וסימול `PRINT`, ומטביע אספקה ראשונית ל-deployer בזמן הפריסה. הפונקציה `mintReward(address to, uint256 amount)` מאפשרת לבעלים להטביע תגמולי PRINT למשתמשים.

במודל הפרויקט, PRINT הוא **טוקן תגמול/נאמנות**, לא מטבע התשלום המרכזי. רכישות ב-Marketplace מתבצעות ב-ETH מקומי של רשת Hardhat. קובץ הבדיקות `test/PrintToken.test.js` בודק שם, סימול, אספקה ראשונית, העברות ו-minting של תגמולים.

### NFT: PrintLicenseNFT

הדרישה ל-NFT ממומשת בחוזה `PrintLicenseNFT`, שהוא ERC721 עם אחסון URI. כל NFT מייצג **רישיון להשתמש, להדפיס או לייצר את המודל/הקובץ הדיגיטלי**. החוזה שומר נתונים מרכזיים:

- `tokenId`
- כתובת היוצר המקורי `creator`
- כותרת ותיאור
- `fileCid`
- `metadataCid`
- `tokenURI`
- זמן יצירה `createdAt`
- מחיר התחלתי `initialPrice`

הפונקציה המרכזית היא `mintLicense(...)`, שמטביעה NFT חדש, שומרת את פרטי הרישיון, שומרת URI למטא־דאטה, ומוסיפה רשומת היסטוריה ראשונה מסוג `MINT`.

### NFT עם זיכרון של בעלים והיסטוריה

הפרויקט שומר זיכרון בעלים באמצעות `OwnershipRecord[]` לכל NFT. כל רשומה כוללת:

- `previousOwner`
- `newOwner`
- `price`
- `timestamp`
- `actionType`, למשל `MINT` או `SALE`

בעת mint נרשמת בעלות ראשונה מכתובת אפס לכתובת היוצר. בעת מכירה דרך marketplace, הפונקציה `controlledTransferFrom(...)` מעבירה את ה-NFT ומוסיפה רשומת `SALE`. ההיסטוריה נקראת דרך `getOwnershipHistory(tokenId)` ומוצגת בממשק.

### 10% תמלוג ליוצר המקורי

הדרישה למעבר בעלות עם 10% ליוצר מיושמת בחוזה `PrintMarketplace`. כאשר קונה קורא ל-`buyLicense(tokenId)` ושולח בדיוק את המחיר ב-ETH:

- החוזה שולף את היוצר המקורי מתוך `getLicenseInfo(tokenId)`.
- מחשב `royaltyAmount` כ-10% מהמחיר.
- מחשב `sellerAmount` כ-90% מהמחיר.
- מעביר את ה-NFT לקונה דרך `controlledTransferFrom`.
- שולח ETH ליוצר ולמוכר.

בדיקת `PrintMarketplace` כוללת תרחיש resale שבו היוצר המקורי מקבל 10% והמוכר הנוכחי 90%. חשוב להסביר בהדגמה ש-MetaMask לא תמיד מציג העברה פנימית מחוזה כחיווי Activity נפרד, ולכן מאמתים את התמלוגים באמצעות יתרות או בדיקות אוטומטיות.

הערה חשובה: אכיפת התמלוגים מתבצעת **בתוך המרקטפלייס של הפרויקט**. אם NFT היה עובר מחוץ למרקטפלייס, התמלוג לא היה נאכף שם. בפרויקט זה העברות רגילות מוגבלות כדי לעודד מכירות דרך marketplace.

### תאריכים שנרשמים בחוזים

החוזים משתמשים ב-`block.timestamp` במספר נקודות:

- `createdAt` בעת mint של רישיון חדש.
- `listedAt` בעת יצירת listing במרקטפלייס.
- `OwnershipRecord.timestamp` בעת MINT/SALE.
- אירועים כגון `LicenseMinted`, `LicenseListed`, `LicenseSold`, `LicenseDelisted` כוללים timestamp.

כך אפשר להציג בממשק מתי נוצר הרישיון, מתי הוא נמכר ומתי השתנתה בעלות.

### צבירת היסטוריה

היסטוריה נצברת במערך רשומות לכל NFT. הרשומות נשארות בחוזה וניתן לקרוא אותן דרך frontend. ההיסטוריה כוללת גם מחיר בכל שינוי בעלות, ולכן היא משמשת כהיסטוריה בסיסית של מחירים.

ממצא בדיקה: במסמך התכנון הופיעה דרישה לפונקציה `getPriceHistory(...)`, אך בחוזה הנוכחי אין פונקציה נפרדת בשם זה ואין מערך price history נפרד. בפועל המחירים נשמרים בתוך `OwnershipRecord.price`. לכן הדרישה של היסטוריה עומדת, אך דרישה ספציפית ל-price history נפרד עומדת חלקית בלבד.

### IPFS

החוזה אינו שומר קבצים מלאים בבלוקצ'יין, אלא רק CIDs ו-URI:

- `fileCid`
- `metadataCid`
- `tokenURI`, לדוגמה `ipfs://...`

ב-frontend יש adapter בשם `uploadAdapter.js`. אם לא מוגדר endpoint אמיתי להעלאה, adapter יוצר CID דמו מסוג `mock-*` על בסיס hash מקומי ושומר מטא־דאטה קלה ב-sessionStorage. זה טוב להדגמה מקומית, אך אינו IPFS אמיתי. אם מגדירים `VITE_IPFS_UPLOAD_ENDPOINT`, אפשר לחבר שירות העלאה אמיתי, אך אין בפרויקט מפתחות אמיתיים ואין להוסיף מפתחות פרטיים.

לכן: רישום CID בחוזה קיים; העלאה אמיתית ל-IPFS היא אפשרות חיבור/הרחבה, ובמצב המקומי היא מוק/דמו.

### MetaMask

הממשק מתחבר ל-MetaMask דרך `window.ethereum`. הפונקציה `connectWallet` מבקשת הרשאת חשבונות עם `eth_requestAccounts`, יוצרת מופע `Web3`, קוראת Chain ID ומעדכנת את כתובת הארנק.

להדגמה משתמשים ברשת Hardhat מקומית:

- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

יש להשתמש רק בחשבונות בדיקה של Hardhat. אין להשתמש במפתחות האלה ב-mainnet או בכל רשת אמיתית.

### חוזה יחסית מורכב

הפרויקט כולל שלושה חוזים שמשתפים פעולה:

1. `PrintToken` — ERC20 לתגמולים.
2. `PrintLicenseNFT` — ERC721 לרישיון ייצור/שימוש, כולל היסטוריית בעלות והגבלת העברות.
3. `PrintMarketplace` — listing, ביטול listing, קנייה ב-ETH, תמלוג 10%, העברת NFT והסרת listing.

המורכבות כוללת הרשאות `Ownable`, מגבלת העברות כדי שהיסטוריה ותמלוגים יישמרו, ניהול מערך active listings, חלוקת כספים, אירועים ובדיקות אוטומטיות.

### ממשק אינטרנטי

הממשק נמצא תחת `frontend/` ונבנה ב-React עם Vite. הוא מציג:

- Marketplace listings.
- חיבור Wallet ומצב רשת.
- יתרת PRINT.
- טופס Mint לרישיון חדש.
- פרטי NFT והיסטוריה.
- My Owned Licenses.
- Created & Sold Licenses.
- פעולות list/cancel/buy.
- כפתור/בדיקה ל-x402 demo.

### web3.js

ב-frontend נעשה שימוש מפורש ב-`web3.js` ולא ב-ethers.js. הקובץ `frontend/package.json` כולל dependency בשם `web3`, וב-`frontend/src/main.jsx` יש `import Web3 from "web3"`. החוזים נטענים עם `new web3.eth.Contract(abi, address)`, ועסקאות נשלחות דרך MetaMask.

שימוש ב-ethers.js קיים בסקריפטי Hardhat ובבדיקות Node.js בלבד, לא ב-frontend. זה מקובל משום שדרישת הקורס לגבי `web3.js` היא לממשק ה-DApp בצד המשתמש.

### x402 / HTTP 402

ה-backend מממש route:

```text
GET /api/paid-preview/:tokenId
```

אם הבקשה מגיעה בלי הוכחת תשלום מוק, השרת מחזיר HTTP 402 Payment Required עם JSON שמסביר איך לשלוח proof דמו. אם הבקשה כוללת header:

```text
x-printchain-demo-payment: paid
```

או query מתאים, השרת מחזיר 200 עם משאב protected preview דמיוני.

זהו **דמו x402-style בלבד**. אין סליקת תשלום אמיתית, אין אימות מול רשת תשלומים ואין credentials. זה מסומן כך בקוד ובתיעוד, ומתאים לדרישת קורס שמבקשת הדגמת HTTP 402 בסיסית.

### ERC2981 royaltyInfo

במסמכי הפרויקט המקוריים הופיעה דרישה לתמיכה ב-ERC2981. בבדיקה הנוכחית של החוזה `PrintLicenseNFT` לא נמצאה ירושה מ-`ERC2981` ולא נמצאה פונקציה `royaltyInfo`. לכן תמיכה תקנית ב-ERC2981 אינה קיימת כרגע.

עם זאת, אכיפת 10% תמלוג בפועל דרך `PrintMarketplace.buyLicense` קיימת ונבדקת. מבחינת דרישת הקורס בעברית, "מעבר מבעלות אחת לשניה מחייבת 10% העברה ליוצר" — הדרישה עומדת במסגרת המרקטפלייס המקומי. מבחינת דרישת התכנון הפנימית של הפרויקט ל-ERC2981 — יש פער שצריך לציין ביושר.

## 4. הוראות דמו מקומי

להרצה נקייה במחשב מקומי:

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
npx hardhat node
```

בטרמינל נוסף:

```bash
npm run deploy:local
npm run seed:local
npm run backend
npm run frontend
```

הערות:

- `npx hardhat node` חייב להישאר פתוח.
- `npm run deploy:local` יוצר `frontend/src/config/contracts.json` עם כתובות החוזים המקומיות.
- `npm run seed:local` יוצר נתוני דמו, כולל NFT/listing ו-CIDs דמיוניים.

## 5. הגדרת MetaMask

יש להוסיף רשת ידנית:

- Network name: `Hardhat Localhost`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency: `ETH`

אזהרה: חשבונות Hardhat הם חשבונות ציבוריים ומוכרים. מותר להשתמש בהם רק ברשת המקומית. **אסור להשתמש במפתחות האלה ב-mainnet, Sepolia אמיתי עם כסף, או כל רשת ציבורית עם נכסים אמיתיים.**

## 6. תפקידי חשבונות דמו

כאשר מריצים `npx hardhat node`, Hardhat מציג רשימת חשבונות בדיקה. לפי הסקריפטים והבדיקות בפרויקט:

- **deployer / contract owner**: החשבון הראשון, index 0. פורש חוזים ומחזיק בעלות על `PrintToken`.
- **creator / seller**: החשבון השני, index 1. מקבל PRINT בדמו, מטביע NFT ומוכר אותו.
- **buyer**: החשבון השלישי, index 2. קונה את ה-NFT במכירה הראשונה.
- **resale buyer**: החשבון הרביעי, index 3. משמש להדגמת resale ותמלוג 10% ליוצר.

כתובות Hardhat נפוצות בדמו מקומי:

| תפקיד | כתובת מקומית נפוצה |
|---|---|
| deployer / owner | `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266` |
| creator / seller | `0x70997970c51812dc3a010c7d01b50e0d17dc79c8` |
| buyer | `0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc` |
| resale buyer | `0x90f79bf6eb2c4f870365e785982e1f101e93b906` |

אם Hardhat מציג כתובות אחרות, יש להשתמש בכתובות שמופיעות בטרמינל שלכם.

## 7. איך להדגים בפועל

1. להריץ `npx hardhat node`.
2. להריץ `npm run deploy:local`.
3. להריץ `npm run seed:local` כדי ליצור listing ראשוני.
4. להריץ `npm run backend`.
5. להריץ `npm run frontend`.
6. לפתוח את כתובת Vite בדפדפן.
7. לחבר MetaMask לרשת `localhost:8545`, Chain ID `31337`.
8. לצפות ב-marketplace listing.
9. לפתוח פרטי NFT ולראות title, description, file CID, metadata CID, creator, owner, timestamp והיסטוריה.
10. להטביע NFT חדש בטופס Mint. במצב ברירת מחדל ייווצרו CIDs מסוג `mock-*`.
11. לראות שה-NFT מופיע ב-My Owned Licenses.
12. לבצע list NFT במחיר ETH מקומי.
13. לבצע cancel listing ולהראות שה-listing יורד.
14. לבצע list מחדש.
15. לעבור לחשבון buyer ב-MetaMask ולקנות NFT.
16. לראות שה-owner השתנה ושהיסטוריית SALE נוספה.
17. לעבור לחשבון buyer, לפרסם resale, ואז לקנות מחשבון resale buyer.
18. לאמת שהיוצר המקורי קיבל 10% והמוכר 90% באמצעות יתרות או test.
19. לראות My Owned Licenses ו-Created & Sold Licenses.
20. לבדוק x402 ללא תשלום:

```bash
curl -i http://127.0.0.1:4000/api/paid-preview/1
```

צריך לקבל HTTP 402.

21. לבדוק x402 עם proof דמו:

```bash
curl -i -H "x-printchain-demo-payment: paid" http://127.0.0.1:4000/api/paid-preview/1
```

צריך לקבל HTTP 200 ו-JSON עם protected preview דמו.

## 8. אמיתי מול מוק/דמו

### אמיתי ברשת מקומית

- חוזי Solidity נפרסים ל-Hardhat local blockchain.
- ERC20 PRINT אמיתי ברשת המקומית.
- ERC721 license NFT אמיתי ברשת המקומית.
- Marketplace אמיתי שמבצע קנייה ב-ETH מקומי.
- העברת בעלות NFT דרך marketplace.
- חלוקת ETH פנימית: 10% ליוצר המקורי ו-90% למוכר.
- שמירת timestamps והיסטוריית בעלות בחוזה.
- frontend ו-backend הם אפליקציות מקומיות אמיתיות.

### מוק/דמו

- העלאת IPFS במצב ברירת מחדל היא מוק: נוצרים CIDs מסוג `mock-*` ולא מתבצעת העלאה אמיתית ל-IPFS.
- סקריפט seed משתמש ב-CIDs דמיוניים לצורך הדגמה.
- x402 הוא מוק מקומי: header או query משמשים כהוכחת תשלום דמו, ללא סליקה אמיתית.
- אין מפתחות Pinata, אין private keys, אין payment credentials ואין הגדרת mainnet/Sepolia.

## 9. מסקנה סופית

הפרויקט **עומד ברוב דרישות קורס ה-DApp** כפי שנוסחו בעברית:

- יש DApp עם חוזים וממשק.
- יש ERC20.
- יש NFT.
- יש היסטוריית בעלות על-chain.
- יש מכירה דרך marketplace עם 10% תמלוג ליוצר המקורי.
- יש timestamps והיסטוריה מצטברת.
- יש רישום CIDs של קובץ ומטא־דאטה.
- יש חיבור MetaMask.
- יש ממשק אינטרנטי.
- יש שימוש ב-`web3.js` ב-frontend.
- יש דמו x402/HTTP 402.

יש לציין ביושר שני פערים/הסתייגויות:

1. **IPFS** — במצב המקומי ברירת המחדל היא דמו/מוק, לא העלאה אמיתית. החוזה והממשק תומכים בשמירת CID, אבל כדי לבצע העלאה אמיתית צריך לחבר endpoint מתאים בלי להכניס סודות לריפו.
2. **ERC2981** — התמלוג של 10% נאכף בפועל במרקטפלייס, אך החוזה הנוכחי אינו חושף `royaltyInfo` תקני של ERC2981.

לכן, עבור דרישות הקורס בעברית, הפרויקט מתאים להצגה כ-DApp מלא מקומי עם רכיבי דמו מסומנים בבירור. עבור דרישות פרויקט פנימיות רחבות יותר, מומלץ בעתיד להוסיף תמיכת ERC2981 תקנית ופונקציית price history נפרדת אם המרצה דורש זאת במפורש.
