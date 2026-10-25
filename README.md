# Lilixy Wallet

Lilixy Wallet, tamamen tarayıcıda imzalayan, non-custodial ve çok zincirli bir Next.js cüzdan uygulamasıdır. Private key cihazdan çıkmaz; mnemonic yalnızca kullanıcı şifresiyle şifrelenmiş olarak IndexedDB'de tutulur.

> Bu proje üretim öncesi bir referans uygulamasıdır. Gerçek fonlarla kullanılmadan önce bağımsız güvenlik denetimi, üretim seviyesinde RPC/altyapı ve hukuki inceleme gerekir.

---

## Özellikler

- **Onboarding**
  - 12 kelimelik BIP39 mnemonic üretimi
  - Rastgele 3 kelimeyle yedek doğrulama
  - 12 kelimeyle içe aktarma ve checksum doğrulaması
  - Şifre gücü kontrolü ve şifre tekrarı
  - Onboarding tamamlandıktan sonra doğrudan kilit ekranı
- **Güvenlik**
  - PBKDF2-SHA-256, 600.000 iterasyon
  - AES-256-GCM, rastgele 12-byte IV
  - Yalnızca ciphertext, salt, IV, KDF parametreleri ve sürüm saklanır
  - Şifre hash'i saklanmaz; doğrulama AES-GCM authentication ile yapılır
  - Otomatik kilit: 1/5/15/30 dk veya sekme kapanınca
  - Manuel kilitleme, şifre değiştirme, kurtarma ifadesi gösterme, cüzdan sıfırlama
  - Yanlış şifrede artan gecikme
  - Sekme kapanınca bellekten temizlik; sayfa yenilenince kilitli başlangıç
- **Cüzdan**
  - Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, Base, Avalanche, Sonic, zkSync Era, Robinhood Chain
  - LI.FI'nin desteklediği diğer EVM zincirleri
  - Kullanıcı tanımlı ağlar ve ERC-20 tokenları
  - Çoklu zincir bakiyeleri, CoinGecko fiyatları ve 24 saatlik değişim
  - Native + ERC-20 gönderme, gerçek zamanlı gas tahmini ve onay ekranı
  - %25/%50/%75/Max hızlı miktar seçimi
  - Native gönderimde gas için %20 güvenlik payı; ERC-20'de native gas kontrolü
  - OP Stack L1 veri ücreti ve Arbitrum için ek gas payı
  - Gönder token listesi ağa göre gruplu; sıfır bakiyeler varsayılan gizli
  - Token satırında Gönder/Al kısayolları ve token detayı
  - Adres ve QR ile alma
  - Arama, ağ filtresi, skeleton ve tasarlanmış boş/hata durumları
- **Swap ve Bridge**
  - LI.FI Widget, `subvariant: 'split'` ile iki sekme
  - Uygulamanın wagmi config'ini kullanan local connector
  - Widget'ın kendi cüzdan bağlama arayüzü gizli
  - Integrator fee env üzerinden
  - Tema ve dil senkronizasyonu
  - Widget event'leri ve LI.FI status API ile geçmiş
- **İşlem geçmişi — yalnızca yerel**
  - Gönder, al, swap, bridge, approve, contract ve cancel türleri
  - Yalnızca cihazdaki IndexedDB'de saklanır
  - Adres bazlı harici geçmiş servisi yoktur
  - Pending durumu yalnızca ilgili zincirin RPC receipt sorgusuyla güncellenir
  - Köprü durumu yalnızca kayıtlı tx hash için LI.FI status endpoint'iyle güncellenir
  - Ağ, tür ve durum filtreleri
  - Explorer linki ve tx hash kopyalama
  - Ayarlar > yerel işlem geçmişini temizle
- **Ayarlar**
  - Sistem/aydınlık/karanlık tema
  - Küçük / varsayılan / büyük uygulama yazı tipi ölçeği
  - Türkçe, İngilizce, İspanyolca, Almanca, Fransızca, Rusça, Arapça (RTL), Çince, Japonca
  - USD/EUR/TRY/GBP para birimi
  - Ağ ve token yönetimi cüzdan sekmesinde (global ağ seçici yok)
  - X, Discord ve e-posta iletişim bağlantıları
  - Pending işlemler, şifre değiştirme, kurtarma ifadesi, sıfırlama
- **Güvenlik başlıkları**
  - Nonce tabanlı CSP, `strict-dynamic`
  - `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`
  - Harici script, analytics veya takip yok
- **Test**
  - Vault encrypt/decrypt, yanlış şifre, tamper, zayıf KDF
  - BIP39 üretim/doğrulama/checksum/challenge
  - Şifre gücü ve rate limit
  - IndexedDB vault repository
  - Tüm dillerde key parity ve interpolation kontrolü

---

## Tasarım sistemi: Azure Glass

Arayüz mavi/beyaz ürün diline döndü; cam yüzeyler artık bilgi mimarisinin parçası. Amaç, mavi-beyaz bir cüzdanda derinlik hissi vermek; süs olarak blur kullanmak değil.

- **Azure day** varsayılan: beyaz paper, lacivert ink, mavi aksiyon.
- **Azure night**: lacivert paper, buz beyazı ink, aynı mavi aksiyon.
- Tek display/body çifti: **Wix Madefor Display** + **Wix Madefor Text**.
- Glass: sidebar, mobil header ve alt navigasyon, auth paneli, bakiye paneli, geçmiş paneli, ayarlar adres şeridi, token listesi ve LI.FI widgetı.
- Auth ekranlarındaki fotoğraf kaldırıldı; yerine mavi aurora, cam düzlemler ve cam kasa paneli geldi.
- Sidebar nav butonları ve token satırları **16px** yuvarlak; kartlar **18px**, kontroller **10px**, primary butonlar **pill**.
- Contact butonları X, Discord ve e-posta için tema mavisinde; marka dışı sabit renk yok.
- Pozitif fiyat mavi, hata/negatif kiremit; iki sinyal ailesi korunur.
- Mobilde tam genişlik + glass alt navigasyon; masaüstünde 252px yüzen glass rail + ortalanmış içerik.
- Karşılama ekranında gizlilik/koşullar ve iletişim sayfa footer’ında yer alır; LI.FI widget cam yüzeylidir.
- Tema değerleri `lib/design/tokens.ts` ve `app/globals.css` içinde tek yerde tanımlıdır.

Renk token'ları:

| Rol | Azure day | Azure night |
|---|---|---|
| Paper | `#F4F8FF` | `#0B1220` |
| Card | `#FFFFFF` | `#111B2E` |
| Rule | `#D7E3F3` | `#24334C` |
| Ink | `#0F172A` | `#EAF1FB` |
| Muted ink | `#64748B` | `#94A3B8` |
| Primary | `#2563EB` | `#60A5FA` |
| Destructive | `#C2410C` | `#FCA5A5` |

---

## Hızlı başlangıç

Gereksinimler:

- Node.js **20.9+** (bu projede Node 24 ile geliştirildi)
- npm **10+**

```bash
npm install --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

Tarayıcıda `http://localhost:3000` açın.

> `--legacy-peer-deps`, LI.FI Widget v3'ün Solana/Sui peer dependency aralıkları ile React 19 arasındaki npm peer çözümlemesi için gereklidir.

### Komutlar

```bash
npm run dev        # geliştirme
npm run build      # production build
npm start          # production server
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm test           # Vitest
```

---

## Ortam değişkenleri

`.env.example` dosyasını `.env.local` olarak kopyalayın.

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `NEXT_PUBLIC_LIFI_FEE` | Hayır | Integrator fee, ondalık oran. Varsayılan `0.0025` (= %0.25). `0–0.05` aralığına sınırlandırılır. |
| `NEXT_PUBLIC_LIFI_API_KEY` | Hayır | Widget/SDK için public LI.FI anahtarı. Client bundle'da görünür. |
| `LIFI_API_KEY` | Hayır | Server-side chains/status/RPC proxy anahtarı. |
| `COINGECKO_API_KEY` | Hayır | CoinGecko fiyat/logo proxy anahtarı. |
| `COINGECKO_API_PLAN` | Hayır | `demo` veya `pro`. |
| `NEXT_PUBLIC_RPC_ETHEREUM` | Hayır | Ethereum için öncelikli RPC. |
| `NEXT_PUBLIC_RPC_BSC` | Hayır | BNB Chain RPC. |
| `NEXT_PUBLIC_RPC_POLYGON` | Hayır | Polygon RPC. |
| `NEXT_PUBLIC_RPC_ARBITRUM` | Hayır | Arbitrum RPC. |
| `NEXT_PUBLIC_RPC_OPTIMISM` | Hayır | Optimism RPC. |
| `NEXT_PUBLIC_RPC_BASE` | Hayır | Base RPC. |
| `NEXT_PUBLIC_RPC_AVALANCHE` | Hayır | Avalanche C-Chain RPC. |
| `NEXT_PUBLIC_APP_VERSION` | Hayır | Ayarlar ekranında görünen sürüm. |

`NEXT_PUBLIC_*` değişkenleri tarayıcıya gider. API anahtarlarını mümkün olduğunca server-side tutun.

---

## LI.FI integrator ve fee

Widget şu şekilde yapılandırılır:

```ts
integrator: "lilixy"
fee: 0.0025 // NEXT_PUBLIC_LIFI_FEE = %0.25
```

**Önemli:** Fee tahsil edilebilmesi için `lilixy` integrator adının LI.FI Partner Portal'da kayıtlı/doğrulanmış olması gerekir. Kayıt yoksa widget çalışır, fakat integrator fee tahsil edilmeyebilir.

- LI.FI Partner Portal: <https://portal.li.fi/>
- Fee dokümantasyonu: <https://docs.li.fi/introduction/integrating-lifi/monetizing-integration>
- Widget playground: <https://playground.li.fi/>

### Sürüm notu: neden LI.FI v3?

Bu proje, gereksinimlerde istenen **wagmi v2**, **`useSyncWagmiConfig`** ve **`subvariant: 'split'`** API'lerine uymak için şu sürümlere sabitlenmiştir:

- `@lifi/widget@3.40.12`
- `@lifi/wallet-management@3.22.8`
- `wagmi@2.19.5`

Güncel LI.FI Widget v4, wagmi v3'e geçmiştir; `subvariant` yerine `mode` kullanır ve top-level `fee` alanını kaldırmıştır. v4'e geçmek isterseniz widget config, local connector ve `useSyncWagmiConfig` entegrasyonu birlikte migrate edilmelidir.

LI.FI v3'te Arapça ve Rusça dil kaynağı yoktur. Uygulama dili `ar` veya `ru` olduğunda widget İngilizceye düşer; uygulamanın kendi arayüzü seçilen dilde kalır.

---

## Güvenlik mimarisi

### Vault

```
VaultRecord
├─ version: 1
├─ createdAt
├─ kdf: { name: "PBKDF2", hash: "SHA-256", iterations: 600000, salt: base64 }
└─ cipher: { name: "AES-GCM", iv: base64, ciphertext: base64 }
```

- Şifre `NFKC` normalize edilir ve UTF-8 byte olarak PBKDF2'ye verilir.
- AES anahtarı `deriveKey` ile üretilir ve non-extractable tutulur.
- Her kayıt için 16-byte salt + 12-byte IV üretilir.
- AES-GCM `additionalData = "lilixy-vault:v1"` ile sürüme bağlanır.
- 600.000'in altındaki iterasyon değerleri reddedilir.
- Şifre verifier'ı yoktur; yanlış şifre GCM tag doğrulamasıyla anlaşılır.
- Vault yalnızca IndexedDB'de tutulur.

### Bellek

- Mnemonic React dışındaki modül-private bellekte tutulur.
- Zustand yalnızca kilit durumu ve adres gibi geçici verileri tutar; `persist` yoktur.
- Kilitlenince mnemonic/account referansları temizlenir, wagmi disconnect edilir ve query cache temizlenir.
- `pagehide` ve görünürlük değişiklikleri otomatik kilit için dinlenir.
- Sayfa yenilenmesi bilinçli olarak cüzdanı kilitler.

### Kalıcı veriler

| Veri | Konum | Hassas mı? |
|---|---|---|
| Şifreli vault | IndexedDB | Şifreli |
| İşlem geçmişi | IndexedDB | Yalnızca cihazda |
| Dil, para birimi, tema, yazı tipi ölçeği, auto-lock | localStorage / next-themes | Hayır |
| Özel ağlar ve tokenlar | localStorage | Hayır (public metadata) |
| Rate-limit durumu | localStorage | Hayır |
| Mnemonic / private key | Yalnızca RAM | Evet |

Hiçbir analytics, takip veya harici script yoktur. Mnemonic hiçbir log satırına yazılmaz.

### Otomatik kilit ve rate limit

- Auto-lock seçenekleri: 1/5/15/30 dakika, sekme kapanınca.
- Aktivite, görünürlük ve `pagehide` izlenir.
- Rate-limit gecikmesi kademelidir (2 sn → 5 dk). Bu yalnızca arayüz seviyesinde bir yavaşlatmadır; localStorage silinerek atlatılabilir. Gerçek koruma PBKDF2 maliyetidir.

### CSP

CSP `proxy.ts` içinde her istek için yeni bir nonce ile üretilir:

- `script-src 'self' 'nonce-…' 'strict-dynamic'`
- `style-src 'self' 'unsafe-inline'` — MUI/Emotion ve next-themes runtime style injection için
- `connect-src 'self' https: wss:` — kullanıcı tanımlı RPC'ler nedeniyle
- `img-src 'self' data: blob: https:`
- `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`

Ayrıca `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `COOP`, `Permissions-Policy` ve production'da HSTS gönderilir.

### RPC proxy

- Yerleşik ve LI.FI zincirleri için JSON-RPC istekleri `/api/rpc/[chainId]` üzerinden aynı origin'e proxylanır.
- Proxy yalnızca önceden tanımlı/LI.FI doğrulamalı RPC URL'lerine istek atar; keyfi URL kabul etmez.
- Kullanıcı tanımlı özel ağlar doğrudan kendi RPC URL'lerine gider.
- Private key veya mnemonic proxy'ye asla gönderilmez; yalnızca okuma çağrıları ve imzalanmış/broadcast edilecek işlemler geçer.

---

## İşlem geçmişi: yalnızca yerel

- Geçmiş yalnızca uygulama içinden yapılan işlemlerden oluşur: gönder, swap, bridge, approve, contract ve replacement/cancel.
- Kayıtlar yalnızca tarayıcıdaki IndexedDB'de tutulur.
- **Harici bir servise adresle geçmiş sorgusu atılmaz.** Etherscan veya benzeri adres bazlı geçmiş API'si yoktur.
- Pending işlem durumu yalnızca ilgili zincirin RPC'sine tx hash ile receipt sorgusu yapılarak güncellenir.
- Köprü işlemlerinde yalnızca kayıtlı kaynak tx hash için LI.FI status endpoint'i kullanılır.
- Explorer linki yalnızca kullanıcı tıkladığında yeni sekmede açılır; veri çekmez.
- Tarayıcı verileri/site verileri silinirse yerel geçmiş kalıcı olarak kaybolur.
- Ayarlar > **Yerel geçmişi temizle** ile kayıtlar silinebilir.

---

## Özel token ve ağ verileri

Özel tokenlar için piyasa verisi sunucu tarafında şu sırayla aranır:

1. CoinGecko `coins/{platform}/contract/{address}` (chainId → platform eşlemesi)
2. DexScreener `/latest/dex/tokens/{address}`
3. Logo için CoinGecko görseli, sonra Trust Wallet assets repository

Fiyat/değişim bulunamazsa panelde `N/A` gösterilir ve tokenın fiat değeri hesaplanmaz. Eksik veya şüpheli veri tahmin edilmez.

- Bu isteklerde **yalnızca kontrat adresi ve chainId** gönderilir.
- **Kullanıcının cüzdan adresi hiçbir piyasa/logo servisine gönderilmez.**
- Yanıtlar react-query ile 5 dakika önbelleğe alınır; hatalarda exponential backoff ile 2 kez denenir.
- Varsayılan ağ logoları yerel orijinal SVG dosyalarından gelir; bilinmeyen özel ağlar için LI.FI chains verisi kullanılır.
- Özel ağların native coini, CoinGecko asset platformlarındaki `chain_identifier` ve `native_coin_id` eşleşmesiyle fiyat/logo alır.
- Özel token eklerken "Bu token doğrulanmamış" uyarısı gösterilir. Herkes herhangi bir ad/sembolle token oluşturabildiği için kontrat doğrulanmalıdır.

---

## API route'ları

| Route | Amaç | Gizli veri |
|---|---|---|
| `GET /api/prices?ids=…` | CoinGecko fiyat + logo proxy | API key server-side |
| `GET /api/asset-platforms` | CoinGecko chainId → native coin eşleşmesi | Yalnızca genel chain metadata |
| `GET /api/token-market?chainId&address` | CoinGecko contract + DexScreener + Trust Wallet logo fallback | Yalnızca chainId ve kontrat adresi |
| `GET /api/lifi/chains` | LI.FI EVM zincir metadata | Opsiyonel API key server-side |
| `GET /api/lifi/status` | Kayıtlı bridge tx hash durumu | Opsiyonel API key server-side |
| `POST /api/rpc/[chainId]` | JSON-RPC proxy | RPC URL'leri server-side |

Bu route'lar mnemonic, private key, şifre veya imzasız hassas payload almaz. Adres bazlı geçmiş route'u yoktur.

---

## Klasör yapısı

```text
app/
├─ (app)/{wallet,swap,history,settings}/page.tsx
├─ api/{prices,token-market,rpc/[chainId],lifi/{chains,status}}/route.ts
├─ layout.tsx, page.tsx, globals.css
components/
├─ ui/            shadcn/Radix primitives
├─ layout/        AppShell, sidebar, bottom nav
├─ onboarding/    BIP39 create/import/verify
├─ lock/          lock screen
├─ wallet/        dashboard, send, receive, logos, tracker
├─ swap/          LI.FI widget wrapper + event bridge
├─ history/       history rows, filters, bridge watcher
├─ settings/      security, pending, reset
├─ network/       network manager + add/edit form
├─ token/         add/edit token form
└─ providers/     theme, i18n, wagmi/query
lib/
├─ design/        design tokens
├─ crypto/        PBKDF2, AES-GCM vault, encoding
├─ wagmi/         chains, RPC, local connector, validation
├─ lifi/          widget config, fee, route history
├─ wallet/        mnemonic, controller, session memory, replacement
├─ security/      password policy, rate limit
├─ db/            IndexedDB schema/repositories
├─ i18n/          i18next setup, locale metadata, Intl formatters
└─ api/           shared API types
hooks/, store/, locales/, tests/, proxy.ts
```

Ağ ve token ekleme akışları Cüzdan sekmesindedir:

- Varlık listesindeki **Ağları yönet** düğmesiyle ağ yöneticisi
- Yöneticide **Ağ ekle**; özel ağ satırındaki `⋯` menüsünde düzenle/sil
- Token listesinin başlığında **Token ekle**
- Özel token satırındaki `⋯` menüsünde düzenle/sil
- Mobilde bottom sheet, masaüstünde modal
- Global ağ seçici kaldırıldı; gönderim ağı tokenın zincirinden belirlenir

---

## Gizlilik politikası

- Lilixy hesap oluşturmaz, e-posta/telefon toplamaz ve analytics kullanmaz.
- Mnemonic, private key ve şifre hiçbir sunucuya gönderilmez.
- Fiyat proxy'si yalnızca coin kimliklerini; RPC proxy'si yalnızca JSON-RPC payload'ını görür. Adres veya anahtar görmez.
- LI.FI Widget, route/fee hesaplaması için cüzdan adresini LI.FI'ye iletir.
- CoinGecko/DexScreener/Trust Wallet özel token sorguları yalnızca chainId ve kontrat adresini alır; cüzdan adresi gönderilmez.
- CoinGecko fiyat istekleri; RPC sağlayıcıları IP ve JSON-RPC isteklerini görebilir.
- Kullanıcı tanımlı özel RPC'ler doğrudan çağrılır; ilgili RPC sağlayıcısı IP'yi görebilir.
- Yerel geçmiş yalnızca cihazda tutulur ve üçüncü taraflara gönderilmez.
- Üretimde kendi RPC/API altyapınızı kullanmanız önerilir.

---

## Sorumluluk reddi

Bu yazılım “olduğu gibi” sunulur. Kripto varlık kaybı, özel anahtar kaybı, yanlış adres/ağ seçimi, akıllı kontrat riskleri, köprü riskleri, RPC hataları, üçüncü taraf hizmet kesintileri veya tarayıcı güvenlik açıklarından doğan zararlardan kullanıcı sorumludur. Lilixy ekibi kullanıcı adına işlem yapamaz, fonları geri alamaz ve unutulan şifreyi kurtaramaz. Gerçek fonlarla kullanmadan önce bağımsız denetim yaptırın.

---

## Sıkça sorulan sorular

**Şifremi unuttum. Kurtarabilir miyim?**  
Hayır. Non-custodial yapıda şifre sıfırlama yoktur. Cihazı sıfırlayıp 12 kelimelik kurtarma ifadesiyle cüzdanı yeniden içe aktarabilirsiniz.

**12 kelime nerede saklanıyor?**  
Düz metin olarak hiçbir yerde. Yalnızca şifrenizden türetilen anahtarla şifrelenmiş vault olarak IndexedDB'de tutulur.

**Sayfayı yenileyince neden şifre soruyor?**  
Güvenlik gereği. Bellekteki mnemonic/private key sayfa yenilenmesinde temizlenir; cüzdan kilitli başlar.

**Geçmişim nereden geliyor?**  
Yalnızca bu cihazdaki IndexedDB kayıtlarından. Adres bazlı harici geçmiş servisi kullanılmaz. Tarayıcı verilerini silerseniz geçmiş de silinir.

**LI.FI adresimi görüyor mu?**  
Evet. Swap/bridge route'u ve fee hesaplaması için cüzdan adresi LI.FI'ye iletilir. Bu, LI.FI Widget'ın normal çalışma modelidir.

**Integrator fee neden tahsil edilmiyor?**  
`lilixy` integrator'ının LI.FI Partner Portal'da kayıtlı/doğrulanmış olması gerekir. Ayrıca `NEXT_PUBLIC_LIFI_FEE` değerinin doğru olduğundan emin olun.

**Özel RPC ekleyebilir miyim?**  
Evet. Cüzdan sekmesindeki **Ağları yönet** düğmesinden **Ağ ekle** ile HTTPS RPC ekleyebilirsiniz. RPC'nin CORS başlıkları sunması gerekir.

**Gas ücreti nasıl hesaplanıyor?**  
`estimateGas` ve `estimateFeesPerGas` (EIP-1559 yoksa `gasPrice`) kullanılır. Native Max ve yüzdelerde gas için %20 güvenlik payı düşülür. OP Stack zincirlerinde `estimateL1Fee` eklenir; Arbitrum'da daha yüksek gas payı ayrılır.

**Aynı anda birden fazla cüzdan destekleniyor mu?**  
Hayır. Tek cüzdan akışı vardır. Başka bir cüzdana geçmek için sıfırlayıp yeniden içe aktarın.

---

## İletişim

Ayarlar > **İletişim** bölümünde X, Discord ve e-posta bağlantıları bulunur. Bağlantılar tek yerden yönetilir:

- `SOCIAL_LINKS.x`
- `SOCIAL_LINKS.discord`
- `SOCIAL_LINKS.email`

Konfigürasyon: `lib/config/social.ts`. Web'de bağlantılar yeni sekmede `rel="noopener noreferrer"` ile açılır; Electron/Capacitor ortamlarında sistem tarayıcısı kullanılır.

---

## Bilinen riskler ve sınırlar

1. **Tarayıcı hot wallet**: Anahtarlar sıcak tutulur. Hardware wallet/MPC yoktur.
2. **XSS / supply-chain**: CSP ve nonce azaltıcıdır; frontend bağımlılıklarına yönelik bir saldırı anahtarları ele geçirebilir. `npm audit`, lockfile ve bağımsız denetim önerilir.
3. **RAM'de anahtar**: JS string'leri güvenli biçimde sıfırlanamaz. Memory dump veya kötü niyetli eklenti anahtarı okuyabilir.
4. **Kötü niyetli tarayıcı eklentileri**: Sayfaya erişebilen eklentiler mnemonic'i okuyabilir. Temiz profil kullanın.
5. **Kopyalama / ekran görüntüsü**: Kurtarma ifadesi panoya kopyalanabilir; pano diğer uygulamalarca okunabilir.
6. **Offline brute-force**: Rate limit yalnızca UI'dır. Şifreli vault kopyalanıp offline denenebilir. Güçlü ve benzersiz şifre kritiktir.
7. **Şifre sıfırlama yoktur**: Cüzdan yalnızca 12 kelimeyle kurtarılabilir.
8. **Üçüncü taraflar**: LI.FI adres/route bilgisini; CoinGecko/DexScreener yalnızca kontrat adresi ve chainId'yi; RPC sağlayıcıları IP ve JSON-RPC isteklerini görebilir.
9. **Özel RPC güveni ve CORS**: Kullanıcı tanımlı RPC doğrudan çağrılır. Yalnızca güvendiğiniz HTTPS RPC'leri ekleyin.
10. **CSP `connect-src https:`**: Özel RPC URL'leri build zamanında bilinemediği için geniştir. Script tarafı nonce + `strict-dynamic` ile kilitlidir.
11. **`unsafe-inline` stil**: MUI/Emotion ve next-themes runtime style injection kullanır.
12. **LI.FI v3 sabitlemesi**: v3 güncel bakım hattı değildir. v4'e geçiş ayrı bir migration gerektirir.
13. **Dil sınırı**: Widget'ta Arapça/Rusça kaynak yoktur; bu iki dilde widget İngilizce görünür.
14. **Sunucu RPC proxy'si**: Anahtarları görmez, ancak IP ve JSON-RPC isteklerini görür. Üretimde rate-limit, WAF ve kendi node sağlayıcınızı kullanın.
15. **Yerel geçmiş**: Tarayıcı verisi silinirse kaybolur; yedeklenmez.

---

## Testler

```bash
npm test
```

Kapsam:

- AES-GCM encrypt/decrypt round-trip
- Yanlış şifre
- Bozuk ciphertext / IV
- Düşük PBKDF2 iterasyonu
- Her şifrelemede yeni salt/IV
- Vault envelope'unda düz metin mnemonic olmaması
- BIP39 üretim, normalizasyon, checksum
- 3 kelimelik challenge
- BIP32 path ile viem account adresi eşleşmesi
- Şifre politikası
- Rate-limit backoff
- IndexedDB vault repository
- Native max / yüzde / yetersiz gas hesapları (bigint)
- LI.FI fee varsayılanı ve clamp davranışı
- Tüm locale key'leri ve interpolation parity

Production doğrulama:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Arayüz doğrulaması aydınlık/karanlık tema ve mobil/masaüstü genişliklerde yapılmalıdır. Bu revizyon sırasında kilit ekranı, cüzdan, swap, geçmiş ve ayarlar ekranları Chrome'da kontrol edilmiştir.

---

## Deployment

- HTTPS zorunludur; HSTS production'da gönderilir.
- `proxy.ts` Node.js runtime kullanır; statik export desteklenmez.
- API route'ları için serverless/Node hosting gerekir.
- Ortam değişkenlerini hosting panelinde tanımlayın; `.env.local` commit etmeyin.
- RPC proxy'sini edge'de rate-limit'leyin.
- CSP'yi kendi domainlerinize göre daraltın.
- Üretimde kendi CoinGecko/LI.FI anahtarlarınızı ve RPC sağlayıcınızı kullanın.

---

## Lisans / sorumluluk

Bu kod tabanı bir güvenlik garantisi değildir. Kripto varlıkların kaybı, akıllı kontrat riskleri, köprü riskleri, RPC yanlışlıkları ve üçüncü taraf hizmet kesintileri kullanıcının sorumluluğundadır. Gerçek fonlarla kullanmadan önce bağımsız denetim yaptırın.
