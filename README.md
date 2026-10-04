# Dostunu Tanı

HTML + CSS + vanilla JavaScript frontend, Node.js API, Neon PostgreSQL. Telefon və kompüter üçün pastel bulud/ulduz dizaynı. Hello Kitty və Kuromi istifadə olunmur.

## İçində nə var?

- Klassik 15 sual və ya Gemini ilə fərdi 15 sual; hərəsində 4 variant.
- Adını və öz cavablarını seçib test yaratmaq; təsadüfi, daimi paylaşım linki.
- Dostun adını daxil edib testi həll etməsi; xal serverdə hesablanır.
- Altı zarafatlı nəticə rolu; 1080 × 1920 PNG story kartı.
- WhatsApp mətni/linki, telefonun paylaşım menyusu, şəkil endirmə. Instagram/TikTok-a birbaşa avtomatik post etmir: şəkli endirib həmin tətbiqdə yükləyirsən.
- Şəxsi panel: iştirakçı adı, tarix, 15-dən düzgün sayı; nəticəyə basanda hər sual üçün seçilən və düzgün cavab.
- Şəxsi panel açarı ilə başqa cihazdan giriş; test və nəticələri silmək.
- /admin.html: şifrəli giriş, ümumi statistika, testlər, bu səhifədə ad axtarışı, cavab detalları, test/nəticə silmə, səhifələmə, çıxış.
- Qurucu Əli Qurbanov, Instagram/TikTok @ok4nnerr. İstifadəçi adını public HTML fayllarındakı iki linkdən dəyiş.
- Yüngül bulud nəfəsi, göz qırpması, orbit, kart hərəkəti, sual keçidləri, konfetti. Azaldılmış hərəkət ayarına hörmət edir.

## Əvvəl dizayna bax

Node.js 22 və ya daha yeni versiya ilə:

```sh
npm start
```

http://localhost:3000 aç. Database olmadan **açıq göstərilən demo rejimi** işləyir. Demo nəticələr bu brauzerin yaddaşındadır. Demo linkləri digər cihazlarda işləməz, admin demo şifrəsi yoxdur. Real istifadə üçün aşağıdakı quraşdırma lazımdır. index.html-i iki dəfə basıb açmaq əvəzinə serverdən aç: JavaScript moduludur.

## Neon və yerli quraşdırma

1. Neon-da PostgreSQL layihəsi yarat. Connect bölməsindən **pooled connection string** götür (host adında `-pooler` olur), `sslmode=require` saxla.
2. `.env.example` faylını `.env` kimi kopyala. DATABASE_URL yaz. ADMIN_PASSWORD ən azı 12 simvol, SESSION_SECRET ən azı 32 təsadüfi simvol olsun. Aşağıdakı əmr secret yaradır:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

3. Asılılıqları yüklə və database cədvəllərini yarat:

```sh
npm install
node --env-file=.env db/setup.js
node --env-file=.env server.js
```

SQL-i alternativ olaraq Neon SQL Editor-də `db/schema.sql` məzmununu işlətməklə qura bilərsən. API özü cədvəl yaratmır.

## Vercel deploy

1. ZIP-i aç, layihə kökünü GitHub-a əlavə et. `.env`-i GitHub-a göndərmə.
2. Vercel → Add New → Project → həmin repo. Framework Preset: **Other**. Root Directory: `package.json` olan qovluq. Build Command boş, Output Directory boş/default. Install Command: `npm install`. Node: 22.x və ya daha yeni dəstəklənən versiya.
3. Vercel Environment Variables: DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET. Preview/Production üçün lazım olanlarını işarələ. Dəyişiklikdən sonra redeploy et.
4. Neon SQL Editor-də schema.sql-i bir dəfə işlət.
5. Deploy et, ana səhifədə sarı demo yazısı çıxmamalıdır. /admin.html səhifəsinə öz ADMIN_PASSWORD dəyərinlə daxil ol.
6. Bir test yarat, paylaşım linkini başqa brauzerdə aç, həll et, şəxsi paneldə nəticəni və cavab detallarını yoxla. Sonra admin paneldə görünməsini yoxla.

Bu paketdə real Neon parolu və canlı deploy yoxdur. Məlumat bağlantısı sənin env dəyərlərinlə aktivləşir. Frontenddə DATABASE_URL və admin şifrəsi yerləşdirmə.

## Məxfilik və giriş məntiqi

Düzgün cavablar açıq test GET sorğusunda gəlmir; serverdə qiymətləndirilir. Test sahibi təsadüfi şəxsi açar alır; database yalnız açarın SHA-256 hash-ini saxlayır. Panel açarı fragmentdə gəlir, ilk açılışda URL-dən çıxarılıb yerli yaddaşda saxlanır. Şəxsi linki bilən adam panelə daxil ola bilər — onu yalnız özün saxla. Açarı itirsən, giriş bərpası yalnız sayt administratoru vasitəsilə mümkündür; e-mail hesab sistemi bu versiyada yoxdur. Eyni adam yenidən həll edə bilər: bunlar ayrı nəticələr kimi göstərilir, ad şəxsiyyət təsdiqi deyil.

Admin sessiyası HMAC imzalı, 8 saatlıq HttpOnly / SameSite=Strict cookie-dir, Vercel-də Secure bayrağı ilə. Serverdə giriş icazəsi yoxlanır, SQL parametrlidir. API saatlıq IP əsasında sürət həddi tətbiq edir (admin giriş: 10, digər POST: 100). Public API cavablarında şəxsi nəticələr yoxdur. Test sahibi bütün dostların seçdiyi cavabları görə bilir; bu fakt test başlamazdan əvvəl göstərilir. İstifadəçi üçün silmə sorğusu test sahibinə/adminə çatdırılır; paneldə silmə var. Adı əsl ad etmək məcburi deyil, ləqəb də olar.

## 500 MB kifayətdirmi?

Başlanğıc üçün bu mətn/rəqəm layihəsinə uyğundur. Şəkil serverdə və database-də saxlanmır, brauzerdə yaradılıb endirilir. Faktiki tutumu SQL ilə izləyə bilərsən:

```sql
SELECT pg_size_pretty(pg_database_size(current_database()));
SELECT pg_size_pretty(pg_total_relation_size('quizzes')) AS quizzes,
       pg_size_pretty(pg_total_relation_size('attempts')) AS attempts;
```

Tutum iştirakçıların sayı, adların uzunluğu və indekslərdən asılıdır; paket müəyyən sayda nəticəyə zəmanət vermir. Neon planının compute, bağlantı və transfer limitləri storage-dən ayrıdır.

## Fayllar və yoxlama

- public/index.html, panel.html, admin.html — girişlər
- public/style.css — mobil daxil bütün dizayn və animasiyalar
- public/app.js — bütün ekranlar, demo, paylaşım kartı
- public/questions.js — sabit sual bankı (mövcud testlər varkən sual sırasını/variantlarını dəyişmə; yeni bank üçün ayrıca versiyalaşdırılmış API lazımdır)
- api/index.js — API və icazələr
- api/core.js — validasiya, scoring, sessiya
- db/schema.sql — cədvəllər və indekslər
- server.js — yerli Node server; Vercel api/index.js işlədilir

`npm test` dependency olmadan 17 məntiq/təhlükəsizlik yoxlamasını işlədir. Canlı Neon inteqrasiyası env olmadan yoxlanmır. Dizaynda onlayn Nunito şrifti yüklənməsə sistem şrifti işləyir. Başqa üçüncü tərəf UI kitabxanası yoxdur.


## Gemini ilə şəxsi test

Vercel-də `GEMINI_API_KEY` əlavə et. İstəyə görə `GEMINI_MODEL` ver; default `gemini-3.5-flash-lite`-dır. Açar yalnız serverdə işlənir və API cavablarında göstərilmir. Modelin mövcudluğu və pulsuz kvota Google layihəsinin ayarlarından asılıdır. Model dəyişənini dəyişəndə redeploy et.

Mövcud Neon database üçün bu SQL-i bir dəfə işlət (təkrar icra da təhlükəsizdir):

```sql
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS questions jsonb;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'classic';
CREATE TABLE IF NOT EXISTS app_settings (key text PRIMARY KEY, value jsonb NOT NULL);
```

`Test yarat` → ad → `AI ilə hazırla` → 20–1000 simvol məlumat və üslub → 15 sualı redaktə et → düzgün cavablarını özün seç → paylaş. Şəxsi məlumat sual hazırlamaq üçün Gemini-yə göndərilir; ilkin məlumat database-də saxlanmır. Testin sualları onun `quizzes` sətrində saxlanır və açıq linkdə cavab açarı olmadan göstərilir. Nəticə detalları həmin testin suallarını istifadə edir. Köhnə klassik testlər əvvəlki bankla işləyir.

Admin → `AI idarəsi`: funksiyanı aç/bağla, IP üzrə gündəlik limiti (1–10), sayt üzrə gündəlik limiti (1–500) dəyiş. Default 3/IP, 50/sayt. Sayğaclar Bakı vaxtı gecə 00:00-da yenilənir. Hər qəbul olunan generasiya cəhdi (provider xətası daxil) limitə sayılır. Limit database-də atomik rezervasiya ilə tətbiq edilir; Vercel instansiyaları eyni sayğacı paylaşır. Şəbəkə IP-si hash kimi saxlanır. VPN və başqa şəbəkə IP limitini keçə bilər; saytın ümumi limiti əlavə xərc sərhədidir. Bu limit Google billing büdcəsini əvəz etmir.

SQL yeniləməsi edilməyən sistemdə AI seçimi bağlı görünür, klassik testlər işləyir. Demo rejimində Gemini istifadə edilmir. Google 429, yanlış açar/model, gecikmə və natamam cavab halları istifadəçiyə uyğun mesajla göstərilir. Avtomatik ödənişli retry yoxdur. API maksimum 25 saniyə gözləyir, Vercel funksiyası üçün 30 saniyə ayrılıb.

`npm test` AI JSON validasiyası, ayrı yaradıcıların sual/nəticə icazələri, IP/ümumi limitlər, admin ayar icazəsi və provider xətalarını mock vasitəsilə yoxlayır. Canlı Gemini və Neon çağırışları testlərdə edilməyib.
