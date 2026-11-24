// Copyright (c) 2026 thezencirs (https://github.com/thezencirs) - MIT License
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace CircleFIDIC.Models;

public static class SeedData
{
    public static string GetDataDirectory()
    {
        var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CircleFIDIC");
        Directory.CreateDirectory(dir);
        Directory.CreateDirectory(Path.Combine(dir, "uploads"));
        return dir;
    }

    public static string GetStateFilePath() => Path.Combine(GetDataDirectory(), "circle_fidic_state_v1.json");

    public static JsonObject LoadOrCreateState()
    {
        var path = GetStateFilePath();
        if (File.Exists(path))
        {
            try
            {
                var node = JsonNode.Parse(File.ReadAllText(path)) as JsonObject;
                if (node != null && node["projects"] is JsonArray arr && arr.Count > 0)
                    return node;
            }
            catch
            {
                // Rebuild clean default state if corrupted
            }
        }

        var fresh = BuildInitialState();
        SaveState(fresh);
        return fresh;
    }

    public static void SaveState(JsonObject state)
    {
        var path = GetStateFilePath();
        var tmp = path + ".tmp";
        var opts = new JsonSerializerOptions { WriteIndented = true };
        File.WriteAllText(tmp, state.ToJsonString(opts));
        File.Move(tmp, path, overwrite: true);
    }

    private static JsonObject BuildInitialState()
    {
        var json = """
        {
          "users": [
            {
              "id": "u-employer",
              "name": "Mehmet Zencir",
              "role": "employer",
              "titleTr": "Yatırımcı / İşveren Kurulu Başkanı",
              "titleEn": "Investor / Employer Representative",
              "fidicClause": "Madde 2",
              "pin": "1001",
              "location": "Merkez & Saha Genel"
            },
            {
              "id": "u-engineer",
              "name": "Selim Kaya",
              "role": "engineer",
              "titleTr": "Proje Yürütücüsü & FIDIC Mühendisi",
              "titleEn": "Project Director & FIDIC Engineer",
              "fidicClause": "Madde 3",
              "pin": "1002",
              "location": "Proje Yönetim Ofisi"
            },
            {
              "id": "u-architect",
              "name": "Zeynep Arslan",
              "role": "architect",
              "titleTr": "Baş Mimar & Tasarım Koordinatörü",
              "titleEn": "Lead Architect & Design Coordinator",
              "fidicClause": "Madde 5",
              "pin": "1003",
              "location": "Mimari & Teknik Ofis"
            },
            {
              "id": "u-site",
              "name": "Murat Demir",
              "role": "sitemanager",
              "titleTr": "Şantiye Şefi / Yüklenici Temsilcisi",
              "titleEn": "Site Manager / Contractor Representative",
              "fidicClause": "Madde 4 & 6",
              "pin": "1004",
              "location": "Merkez Şantiye Mobilizasyon"
            },
            {
              "id": "u-master",
              "name": "Hasan Usta",
              "role": "master",
              "titleTr": "İnce İşler & Seramik Ekipbaşı (Saha)",
              "titleEn": "Finishes & Tile Master Foreman (Field)",
              "fidicClause": "Madde 6 & 7",
              "pin": "1005",
              "location": "A-Kule 3. Kat Islak Hacimler"
            }
          ],
          "projects": [
            {
              "id": "prj-tower",
              "code": "CF-2026-01",
              "scale": "building",
              "scaleLabelTr": "Bina & Kampüs Ölçeği",
              "scaleLabelEn": "Building & Campus Scale",
              "nameTr": "Zencircle Karma Yaşam ve Ofis Kulesi",
              "nameEn": "Zencircle Mixed-Use & Office Tower",
              "city": "İstanbul",
              "lat": 41.0082,
              "lon": 28.9784,
              "fidicBook": "RED",
              "fidicBookTr": "FIDIC Kırmızı Kitap 2017 (Birim Fiyat & İşveren Tasarımlı)",
              "fidicBookEn": "FIDIC Red Book 2017 (Re-measurement & Employer Designed)",
              "currentStage": 3,
              "currency": "₺",
              "contractBudget": 420000000,
              "approvedVariations": 18500000,
              "spentActual": 246800000,
              "earnedValue": 258400000,
              "physicalProgress": 61.5,
              "plannedProgress": 59.2,
              "dailyVelocityPct": 0.19,
              "startDate": "2025-09-01",
              "contractEndDate": "2027-03-15",
              "approvedEotDays": 12,
              "forecastEndDate": "2027-03-19",
              "dnpDays": 365,
              "delayDamagesDaily": 210000,
              "safeDaysWithoutAccident": 418,
              "numbers": {
                "activeWorkers": 186,
                "mastersAndForemen": 48,
                "engineersAndArchitects": 19,
                "activeCranesAndMachines": 11,
                "concretePouredM3": 19450,
                "rebarTons": 2380,
                "completedAreaM2": 28640,
                "totalAreaM2": 46500
              },
              "wbs": [
                { "id": "w1", "code": "01", "level": "Etap", "nameTr": "Altyapı, İksa & 3 Kat Bodrum Otopark", "nameEn": "Substructure, Shoring & 3B Parking", "progress": 100, "budget": 92000000, "owner": "Murat Demir", "clause": "Md. 4.12" },
                { "id": "w2", "code": "02", "level": "Blok", "nameTr": "Podyum Çarşı & Sosyal Avlu (Zemin + 1. Kat)", "nameEn": "Podium Retail & Courtyard (GF + L1)", "progress": 84, "budget": 68000000, "owner": "Zeynep Arslan", "clause": "Md. 7.2" },
                { "id": "w3", "code": "03", "level": "Kule", "nameTr": "A-Kule Kaba Yapı & Alüminyum Giydirme Cephe (24 Kat)", "nameEn": "Tower-A Core/Shell & Curtain Wall (24F)", "progress": 66, "budget": 145000000, "owner": "Murat Demir", "clause": "Md. 8.3" },
                { "id": "w4", "code": "04", "level": "Kat/Mahal", "nameTr": "A-Kule 1–8. Katlar İnce İşler, Seramik & Doğaltaş", "nameEn": "Tower-A L1-L8 Finishes, Tile & Stone", "progress": 42, "budget": 54000000, "owner": "Hasan Usta", "clause": "Md. 7.1" },
                { "id": "w5", "code": "05", "level": "MEP", "nameTr": "Elektrik, İklimlendirme (HVAC), Yangın & Otomasyon", "nameEn": "Electrical, HVAC, Fire & BMS Systems", "progress": 38, "budget": 61000000, "owner": "Selim Kaya", "clause": "Md. 9.1" }
              ],
              "hourlyLogs": [
                { "time": "07:00", "titleTr": "Vardiya Başlangıcı, İSG Saha Kontrolü & Sabah Kahvaltısı", "titleEn": "Shift Start, HSE Briefing & Breakfast", "zone": "Merkez Kamp", "owner": "Murat Demir", "metric": "186 Personel • 0 Risk", "status": "done" },
                { "time": "08:30", "titleTr": "A-Kule 17. Kat Tabliye C40 Beton Dökümü Başladı", "titleEn": "Tower-A L17 Slab C40 Concrete Pour Started", "zone": "A-Kule Kat 17", "owner": "Murat Demir", "metric": "44 m³/saat hız • Numune alındı", "status": "done" },
                { "time": "10:15", "titleTr": "Islak Hacim Su Yalıtımı & 60x120 Porselen Seramik Döşeme", "titleEn": "Wet Area Waterproofing & 60x120 Porcelain Tiling", "zone": "A-Kule Kat 3 Mahal A-102", "owner": "Hasan Usta", "metric": "38 m² tamamlandı", "status": "done" },
                { "time": "12:30", "titleTr": "Öğle Yemeği Dağıtımı & Puantaj Çapraz Sayımı", "titleEn": "Lunch Distribution & Headcount Cross-Check", "zone": "Şantiye Yemekhanesi", "owner": "Murat Demir", "metric": "190 Porsiyon (186 saha + 4 misafir)", "status": "done" },
                { "time": "14:00", "titleTr": "Batı Cephe Modüler Cam Panel Montajı & Kot Kontrolü", "titleEn": "West Facade Unitized Glass Panel Installation", "zone": "A-Kule Kat 9-10", "owner": "Zeynep Arslan", "metric": "16 panel/gün • Lazer aplikasyon onaylı", "status": "active" },
                { "time": "16:30", "titleTr": "Mimar & Şantiye Şefi Eksik (Snag) Kapatma Turu", "titleEn": "Architect & Site Manager Snag Closure Walk", "zone": "Podyum & Kat 3", "owner": "Zeynep Arslan", "metric": "6 eksik incelenecek", "status": "planned" },
                { "time": "18:30", "titleTr": "Gün Sonu İlerleme Kaydı, Malzeme İrsaliye & Gece Bekçi Devri", "titleEn": "End-of-Day Progress Log & Night Security Handover", "zone": "Tüm Saha", "owner": "Selim Kaya", "metric": "+%0,21 günlük ilerleme hedefi", "status": "planned" }
              ],
              "dailySeries": [
                { "date": "16 Kas", "plannedPct": 0.18, "actualPct": 0.20, "workers": 180, "meals": 184, "weather": "16°C Açık" },
                { "date": "17 Kas", "plannedPct": 0.18, "actualPct": 0.21, "workers": 184, "meals": 188, "weather": "15°C Parçalı Bulutlu" },
                { "date": "18 Kas", "plannedPct": 0.18, "actualPct": 0.12, "workers": 162, "meals": 166, "weather": "11°C Sert Rüzgar 54 km/s" },
                { "date": "19 Kas", "plannedPct": 0.19, "actualPct": 0.22, "workers": 188, "meals": 192, "weather": "14°C Güneşli" },
                { "date": "20 Kas", "plannedPct": 0.19, "actualPct": 0.20, "workers": 185, "meals": 189, "weather": "15°C Açık" },
                { "date": "21 Kas", "plannedPct": 0.19, "actualPct": 0.21, "workers": 187, "meals": 190, "weather": "15°C Açık" },
                { "date": "22 Kas", "plannedPct": 0.19, "actualPct": 0.21, "workers": 186, "meals": 190, "weather": "14°C Parçalı Bulutlu" }
              ],
              "weeklySeries": [
                { "week": "Hafta 44", "target": 1.25, "actual": 1.31, "spi": 1.05, "noteTr": "A-Kule çekirdek kalıp çevrimi 5 güne indi", "noteEn": "Core jump-form cycle reduced to 5 days" },
                { "week": "Hafta 45", "target": 1.28, "actual": 1.19, "spi": 0.93, "noteTr": "18 Kasım fırtına nedeniyle kule vinç 6 saat durdu", "noteEn": "Tower crane paused 6h due to 54 km/h wind" },
                { "week": "Hafta 46", "target": 1.30, "actual": 1.38, "spi": 1.06, "noteTr": "Seramik ve cephe ekipleri tam kapasite çalıştı", "noteEn": "Tile and curtain-wall crews hit peak output" },
                { "week": "Hafta 47 (Bu Hafta)", "target": 1.32, "actual": 1.36, "spi": 1.03, "noteTr": "MEP ana şaft montajları programa paralel ilerliyor", "noteEn": "MEP main riser installation tracking baseline" }
              ],
              "monthlySeries": [
                { "month": "Haz 26", "plannedCum": 34, "earnedCum": 35, "spentM": 142, "ipcStatus": "IPC #09 Ödendi" },
                { "month": "Tem 26", "plannedCum": 40, "earnedCum": 41.5, "spentM": 168, "ipcStatus": "IPC #10 Ödendi" },
                { "month": "Ağu 26", "plannedCum": 46, "earnedCum": 47.8, "spentM": 191, "ipcStatus": "IPC #11 Ödendi" },
                { "month": "Eyl 26", "plannedCum": 51.5, "earnedCum": 53.2, "spentM": 214, "ipcStatus": "IPC #12 Ödendi" },
                { "month": "Eki 26", "plannedCum": 56.0, "earnedCum": 58.1, "spentM": 232, "ipcStatus": "IPC #13 Onaylandı (Md.14.6)" },
                { "month": "Kas 26", "plannedCum": 59.2, "earnedCum": 61.5, "spentM": 246.8, "ipcStatus": "IPC #14 İncelemede (16g kaldı)" }
              ],
              "yearlySeries": [
                { "year": "2025", "phaseTr": "İhale, Yer Teslimi (Md. 2.1), İksa & Temel Betonu", "phaseEn": "Tender, Site Access (Cl. 2.1), Shoring & Raft Foundation", "progress": 100 },
                { "year": "2026", "phaseTr": "Kule Kaba Yapı, Giydirme Cephe, İnce İşler & MEP Ana İmalatlar", "phaseEn": "Superstructure, Curtain Wall, Finishes & MEP Main Works", "progress": 68 },
                { "year": "2027", "phaseTr": "Tamamlama Testleri (Md. 9), Geçici Kabul (Md. 10) & DNP Başlangıcı", "phaseEn": "Tests on Completion (Cl. 9), Taking-Over (Cl. 10) & DNP Start", "progress": 12 },
                { "year": "2028", "phaseTr": "DNP Kusur Takibi & Kesin Kabul / İfa Belgesi (Md. 11.9)", "phaseEn": "DNP Defect Closure & Performance Certificate (Cl. 11.9)", "progress": 0 }
              ]
            },
            {
              "id": "prj-city",
              "code": "CF-2026-MEGA",
              "scale": "city",
              "scaleLabelTr": "Şehir & Altyapı Mega Ölçeği",
              "scaleLabelEn": "City & Infrastructure Mega Scale",
              "nameTr": "Kuzey Marmara Eko-Şehir ve Raylı Sistem Masterplanı",
              "nameEn": "North Marmara Eco-City & Rail Link Masterplan",
              "city": "İstanbul",
              "lat": 41.1500,
              "lon": 28.8500,
              "fidicBook": "SILVER",
              "fidicBookTr": "FIDIC Gümüş + Zümrüt Hibrit Kabuk (EPC Anahtar Teslim & Tünel)",
              "fidicBookEn": "FIDIC Silver + Emerald Hybrid Shell (EPC Turnkey & Tunnel)",
              "currentStage": 2,
              "currency": "₺",
              "contractBudget": 4850000000,
              "approvedVariations": 120000000,
              "spentActual": 1690000000,
              "earnedValue": 1745000000,
              "physicalProgress": 35.1,
              "plannedProgress": 34.0,
              "dailyVelocityPct": 0.08,
              "startDate": "2025-04-01",
              "contractEndDate": "2029-04-01",
              "approvedEotDays": 0,
              "forecastEndDate": "2029-03-18",
              "dnpDays": 730,
              "delayDamagesDaily": 1850000,
              "safeDaysWithoutAccident": 592,
              "numbers": {
                "activeWorkers": 1420,
                "mastersAndForemen": 310,
                "engineersAndArchitects": 145,
                "activeCranesAndMachines": 94,
                "concretePouredM3": 184000,
                "rebarTons": 22600,
                "completedAreaM2": 215000,
                "totalAreaM2": 620000
              },
              "wbs": [
                { "id": "cw1", "code": "BÖLGE-1", "level": "Şehir Bölgesi", "nameTr": " Kuzey İstasyon Meydanı & 4,2 km TBM Metro Bağlantı Tüneli", "nameEn": "North Station Plaza & 4.2 km TBM Rail Tunnel", "progress": 48, "budget": 1650000000, "owner": "Selim Kaya", "clause": "Zümrüt GBR" },
                { "id": "cw2", "code": "BÖLGE-2", "level": "Altyapı Ağı", "nameTr": "Yağmursuyu Kolektörü, İçmesuyu, Enerji Galerisi & Ana Bulvar", "nameEn": "Stormwater, Potable Water, Utility Gallery & Main Boulevard", "progress": 52, "budget": 980000000, "owner": "Murat Demir", "clause": "Md. 4.8" },
                { "id": "cw3", "code": "ADA-1..8", "level": "Konut Etapları", "nameTr": "1–8. Yapı Adaları Sürdürülebilir Konut & Okul Kampüsü", "nameEn": "Parcels 1-8 Sustainable Housing & School Campus", "progress": 24, "budget": 1520000000, "owner": "Zeynep Arslan", "clause": "Md. 5.1" },
                { "id": "cw4", "code": "EKOLOJİ", "level": "Şehir Parkı", "nameTr": "Merkez Vadi Parkı, Gri Su Arıtma Tesisi & Güneş Tarlası", "nameEn": "Central Valley Park, Greywater Plant & Solar Array", "progress": 14, "budget": 700000000, "owner": "Hasan Usta", "clause": "Md. 4.18" }
              ],
              "hourlyLogs": [
                { "time": "06:30", "titleTr": "3 Kamp Noktasında Vardiya Değişimi & Sabah İaşesi", "titleEn": "3-Camp Shift Handover & Morning Catering", "zone": "Kamp A-B-C", "owner": "Murat Demir", "metric": "1.420 Personel", "status": "done" },
                { "time": "09:00", "titleTr": "TBM-1 Tünel Açma Makinesi Ring #612 Segment Montajı", "titleEn": "TBM-1 Tunnel Boring Ring #612 Segment Erection", "zone": "Bölge-1 KM 2+140", "owner": "Selim Kaya", "metric": "18,4 m/gün ilerleme", "status": "active" }
              ],
              "dailySeries": [
                { "date": "20 Kas", "plannedPct": 0.08, "actualPct": 0.09, "workers": 1410, "meals": 1435, "weather": "14°C Açık" },
                { "date": "21 Kas", "plannedPct": 0.08, "actualPct": 0.08, "workers": 1418, "meals": 1440, "weather": "15°C Açık" },
                { "date": "22 Kas", "plannedPct": 0.08, "actualPct": 0.09, "workers": 1420, "meals": 1442, "weather": "14°C Parçalı Bulutlu" }
              ],
              "weeklySeries": [
                { "week": "Hafta 47", "target": 0.56, "actual": 0.61, "spi": 1.09, "noteTr": "TBM kazı hızı GBR baz tahmininin %9 üzerinde", "noteEn": "TBM advance rate 9% ahead of GBR baseline" }
              ],
              "monthlySeries": [
                { "month": "Eyl 26", "plannedCum": 31.0, "earnedCum": 32.1, "spentM": 1540, "ipcStatus": "Milestone #07 Ödendi" },
                { "month": "Eki 26", "plannedCum": 32.5, "earnedCum": 33.6, "spentM": 1615, "ipcStatus": "Milestone #08 Ödendi" },
                { "month": "Kas 26", "plannedCum": 34.0, "earnedCum": 35.1, "spentM": 1690, "ipcStatus": "Milestone #09 İncelemede" }
              ],
              "yearlySeries": [
                { "year": "2025", "phaseTr": "Kamulaştırma, Kamp Kurulumu & TBM İndirme Şaftları", "phaseEn": "Land Access, Camp Setup & TBM Launch Shafts", "progress": 100 },
                { "year": "2026", "phaseTr": "Ana Tünel Kazısı, Altyapı Kolektörleri & İlk 4 Konut Adası", "phaseEn": "Main Tunnel Drive, Trunk Utilities & First 4 Parcels", "progress": 64 },
                { "year": "2027-2029", "phaseTr": "Üstyapı Tamamlama, Raylı Sistem Testleri & Kentsel Kabul", "phaseEn": "Superstructure Finish, Rail Commissioning & Handover", "progress": 10 }
              ]
            },
            {
              "id": "prj-villa",
              "code": "CF-2026-MİKRO",
              "scale": "micro",
              "scaleLabelTr": "Mikro Ölçek (Villa / İç Mimari)",
              "scaleLabelEn": "Micro Scale (Villa / Interior Fit-out)",
              "nameTr": "Boğaziçi Özel Taş Villa & İç Mimari Uygulama",
              "nameEn": "Bosphorus Private Stone Villa & Interior Fit-out",
              "city": "İstanbul",
              "lat": 41.0850,
              "lon": 29.0450,
              "fidicBook": "GREEN",
              "fidicBookTr": "FIDIC Yeşil Kitap (15 Maddelik Kısa ve Pratik Sözleşme Kabuğu)",
              "fidicBookEn": "FIDIC Green Book (15-Clause Practical Short Form Shell)",
              "currentStage": 4,
              "currency": "₺",
              "contractBudget": 28500000,
              "approvedVariations": 1400000,
              "spentActual": 21900000,
              "earnedValue": 23100000,
              "physicalProgress": 77.3,
              "plannedProgress": 75.0,
              "dailyVelocityPct": 0.65,
              "startDate": "2026-07-01",
              "contractEndDate": "2026-12-30",
              "approvedEotDays": 5,
              "forecastEndDate": "2026-12-28",
              "dnpDays": 365,
              "delayDamagesDaily": 35000,
              "safeDaysWithoutAccident": 144,
              "numbers": {
                "activeWorkers": 22,
                "mastersAndForemen": 12,
                "engineersAndArchitects": 3,
                "activeCranesAndMachines": 2,
                "concretePouredM3": 480,
                "rebarTons": 62,
                "completedAreaM2": 580,
                "totalAreaM2": 750
              },
              "wbs": [
                { "id": "vw1", "code": "M-01", "level": "Bahçe & Yapı", "nameTr": "Bahçe İstinat, Güçlendirme & Doğal Küfeki Taş Cephe", "nameEn": "Retaining Wall, Structural Retrofit & Natural Stone Facade", "progress": 95, "budget": 11200000, "owner": "Murat Demir", "clause": "Yeşil Md. 4" },
                { "id": "vw2", "code": "M-02", "level": "İç Mekan", "nameTr": "Galeri Salon, Masif Meşe Doğrama, Mermer Şömine & Mutfak", "nameEn": "Gallery Living, Solid Oak Joinery, Marble Fireplace & Kitchen", "progress": 72, "budget": 10800000, "owner": "Hasan Usta", "clause": "Yeşil Md. 5" },
                { "id": "vw3", "code": "M-03", "level": "Akıllı Ev", "nameTr": "Yerden Isıtma, Gizli İklimlendirme & Aydınlatma Senaryoları", "nameEn": "Underfloor Heating, Concealed HVAC & Lighting Scenes", "progress": 60, "budget": 6500000, "owner": "Zeynep Arslan", "clause": "Yeşil Md. 8" }
              ],
              "hourlyLogs": [
                { "time": "08:00", "titleTr": "Ahşap & Mermer Ustaları İşbaşı + Sabah İkramı", "titleEn": "Joinery & Marble Masters Start + Morning Catering", "zone": "Zemin Kat Salon", "owner": "Hasan Usta", "metric": "22 Kişi", "status": "done" },
                { "time": "11:30", "titleTr": "Ebeveyn Banyo Traverten Derz & Armatür Montaj Kontrolü", "titleEn": "Master Bath Travertine Grout & Fixture Check", "zone": "1. Kat Ebeveyn Süiti", "owner": "Zeynep Arslan", "metric": "%90 tamamlandı", "status": "active" }
              ],
              "dailySeries": [
                { "date": "21 Kas", "plannedPct": 0.60, "actualPct": 0.68, "workers": 22, "meals": 23, "weather": "15°C Açık" },
                { "date": "22 Kas", "plannedPct": 0.65, "actualPct": 0.70, "workers": 22, "meals": 22, "weather": "14°C Parçalı Bulutlu" }
              ],
              "weeklySeries": [
                { "week": "Hafta 20", "target": 4.2, "actual": 4.6, "spi": 1.10, "noteTr": "Masif ahşap merdiven korkulukları atölyeden sahaya indi", "noteEn": "Solid oak stair balustrades delivered to site" }
              ],
              "monthlySeries": [
                { "month": "Eki 26", "plannedCum": 60, "earnedCum": 62, "spentM": 17.4, "ipcStatus": "Hakediş #04 Ödendi" },
                { "month": "Kas 26", "plannedCum": 75, "earnedCum": 77.3, "spentM": 21.9, "ipcStatus": "Hakediş #05 Hazır" }
              ],
              "yearlySeries": [
                { "year": "2026", "phaseTr": "Temmuz Başlangıç -> Aralık Sonu Anahtar Teslim (Yeşil Kitap Md. 8)", "phaseEn": "July Start -> Late December Handover (Green Book Cl. 8)", "progress": 77.3 }
              ]
            }
          ],
          "tasks": [
            {
              "id": "tsk-1",
              "projectId": "prj-tower",
              "titleTr": "A-Kule 3. Kat Islak Hacim Çift Bileşenli Su Yalıtımı & Seramik Kaplama",
              "titleEn": "Tower-A Level 3 Wet Area Dual-Coat Waterproofing & Porcelain Tiling",
              "zone": "A-Kule · Kat 3 · Mahal A-102",
              "assigneeId": "u-master",
              "assigneeName": "Hasan Usta",
              "assigneeRole": "master",
              "fidicClause": "Md. 7.1 & 7.3",
              "priority": "high",
              "dueDate": "2026-11-25",
              "progress": 75,
              "status": "in_progress",
              "instructionTr": "Su yalıtımı 24 saat göllenme testi fotoğrafı yüklenmeden seramik yapıştırıcısına geçilmeyecek (Md. 7.3 Üstü Kapatılacak İş Muayenesi)."
            },
            {
              "id": "tsk-2",
              "projectId": "prj-tower",
              "titleTr": "Podyum Batı Cephesi Güneş Kırıcı Detay Paftası (Rev.03) Onayı",
              "titleEn": "Podium West Facade Louver Detail Drawing (Rev.03) Approval",
              "zone": "Podyum · Cephe Aks B-F",
              "assigneeId": "u-architect",
              "assigneeName": "Zeynep Arslan",
              "assigneeRole": "architect",
              "fidicClause": "Md. 1.9 & 5.2",
              "priority": "critical",
              "dueDate": "2026-11-24",
              "progress": 60,
              "status": "in_progress",
              "instructionTr": "Alüminyum profil siparişi gecikmemesi için ankraj kesit detayının 24 Kasım saat 17:00'ye kadar saha klasörüne yayınlanması."
            },
            {
              "id": "tsk-3",
              "projectId": "prj-tower",
              "titleTr": "Ara Hakediş #14 (IPC #14) Metraj Kontrolü ve Mühendis Onayı",
              "titleEn": "Interim Payment Certificate #14 Measurement Check & Certification",
              "zone": "Tüm Proje · Finans",
              "assigneeId": "u-engineer",
              "assigneeName": "Selim Kaya",
              "assigneeRole": "engineer",
              "fidicClause": "Md. 14.6 (28 Gün)",
              "priority": "high",
              "dueDate": "2026-12-06",
              "progress": 50,
              "status": "in_progress",
              "instructionTr": "Yüklenici beyanı 08 Kasım'da alındı; Madde 14.6 gereği en geç 28. günde IPC belgesi düzenlenip Yatırımcıya iletilecek."
            },
            {
              "id": "tsk-4",
              "projectId": "prj-tower",
              "titleTr": "Varyasyon VO-04 (Elektrikli Araç Hızlı Şarj Altyapısı) Bütçe Onayı",
              "titleEn": "Variation VO-04 (EV Fast-Charging Infrastructure) Budget Sign-off",
              "zone": "Bodrum B1-B2 Otopark",
              "assigneeId": "u-employer",
              "assigneeName": "Mehmet Zencir",
              "assigneeRole": "employer",
              "fidicClause": "Md. 13.3",
              "priority": "normal",
              "dueDate": "2026-11-27",
              "progress": 25,
              "status": "open",
              "instructionTr": "40 adet hızlı şarj ünitesi trafo güç artışı teklifi (3.450.000 ₺, süre etkisi 0 gün) yatırımcı onayına sunuldu."
            },
            {
              "id": "tsk-5",
              "projectId": "prj-tower",
              "titleTr": "A-Kule 18. Kat Rüzgar Perdesi & Kule Vinç Ankraj Güvenlik Kontrolü",
              "titleEn": "Tower-A L18 Wind Screen & Tower Crane Tie-In Safety Inspection",
              "zone": "A-Kule · Kat 18",
              "assigneeId": "u-site",
              "assigneeName": "Murat Demir",
              "assigneeRole": "sitemanager",
              "fidicClause": "Md. 4.8 & 6.7",
              "priority": "critical",
              "dueDate": "2026-11-23",
              "progress": 85,
              "status": "in_progress",
              "instructionTr": "Tork anahtarı kontrol tutanağı imzalanıp İSG panosuna işlenecek."
            },
            {
              "id": "tsk-6",
              "projectId": "prj-villa",
              "titleTr": "Galeri Salon Mermer Şömine & Meşe Duvar Paneli Birleşim Uygulaması",
              "titleEn": "Gallery Living Marble Fireplace & Oak Wall Paneling Joinery",
              "zone": "Zemin Kat · Galeri Salon",
              "assigneeId": "u-master",
              "assigneeName": "Hasan Usta",
              "assigneeRole": "master",
              "fidicClause": "Yeşil Md. 4 & 7",
              "priority": "high",
              "dueDate": "2026-11-26",
              "progress": 50,
              "status": "in_progress",
              "instructionTr": "3 mm gölge fugası mimari kesite birebir uygun bırakılacak."
            }
          ],
          "meals": [
            {
              "id": "ml-1",
              "projectId": "prj-tower",
              "date": "2026-11-22",
              "activeHeadcount": 186,
              "breakfast": 164,
              "lunch": 190,
              "dinner": 78,
              "nightShift": 24,
              "waterJugs": 42,
              "unitCostTl": 215,
              "menuTr": "Mercimek Çorbası • Orman Kebabı • Bulgur Pilavı • Ayran & Mevsim Meyvesi (3.450 kcal ağır saha diyeti)",
              "menuEn": "Lentil Soup • Beef Stew • Bulgur Pilaf • Ayran & Fresh Fruit (3,450 kcal site diet)",
              "noteTr": "+4 porsiyon yapı denetim ve cephe numune misafirleri için ayrıldı (%2,1 tolerans — normal)."
            },
            {
              "id": "ml-2",
              "projectId": "prj-tower",
              "date": "2026-11-21",
              "activeHeadcount": 187,
              "breakfast": 165,
              "lunch": 190,
              "dinner": 82,
              "nightShift": 26,
              "waterJugs": 44,
              "unitCostTl": 215,
              "menuTr": "Ezogelin Çorbası • Fırın Tavuk Baget • Pirinç Pilavı • Cacık & İrmik Helvası",
              "menuEn": "Ezogelin Soup • Roasted Chicken • Rice Pilaf • Tzatziki & Semolina Halva",
              "noteTr": "Puantaj ile yemekhane turnike geçişi %98,4 uyumlu."
            },
            {
              "id": "ml-3",
              "projectId": "prj-city",
              "date": "2026-11-22",
              "activeHeadcount": 1420,
              "breakfast": 1290,
              "lunch": 1442,
              "dinner": 640,
              "nightShift": 310,
              "waterJugs": 320,
              "unitCostTl": 205,
              "menuTr": "Yayla Çorbası • Tas Kebabı • Şehriyeli Pilav • Yoğurt & Tatlı (3 Vardiyalı Tünel + Saha Kampı)",
              "menuEn": "Yogurt Soup • Braised Beef • Rice • Yogurt & Dessert (3-Shift Tunnel + Site Camp)",
              "noteTr": "TBM gece vardiyası sıcak kumanya paketleri saat 23:30'da şafta indirildi."
            },
            {
              "id": "ml-4",
              "projectId": "prj-villa",
              "date": "2026-11-22",
              "activeHeadcount": 22,
              "breakfast": 22,
              "lunch": 22,
              "dinner": 0,
              "nightShift": 0,
              "waterJugs": 6,
              "unitCostTl": 240,
              "menuTr": "Domates Çorbası • Izgara Köfte • Piyaz • Ayran",
              "menuEn": "Tomato Soup • Grilled Meatballs • Bean Salad • Ayran",
              "noteTr": "Sıfır fire — 22 usta/personel birebir teslim aldı."
            }
          ],
          "snags": [
            {
              "id": "E-101",
              "projectId": "prj-tower",
              "xPct": 22.5,
              "yPct": 68.0,
              "zone": "Mahal A-102 · Islak Hacim",
              "titleTr": "Duş Süzgeci Eğimi %1,5 Altında — Şap Düzeltmesi Gerekli",
              "titleEn": "Shower Drain Slope Below 1.5% — Screed Correction Needed",
              "severity": "high",
              "assigneeName": "Hasan Usta",
              "assigneeRole": "master",
              "reportedBy": "Zeynep Arslan (Baş Mimar)",
              "fidicClause": "Md. 7.5 & 11.1",
              "dueDate": "2026-11-24",
              "status": "ready_for_review",
              "noteTr": "Hasan Usta: Lazer terazi ile %2 eğim verilerek düzeltildi, su testi fotoğrafı eklendi. Mimar onayı bekleniyor."
            },
            {
              "id": "E-102",
              "projectId": "prj-tower",
              "xPct": 74.0,
              "yPct": 24.5,
              "zone": "Mahal B-101 · Doğu Panorama",
              "titleTr": "Alüminyum Doğrama Denizlik Damlalık Fitili Eksik",
              "titleEn": "Curtain Wall Sill Drip Gasket Missing on Axis 4",
              "severity": "critical",
              "assigneeName": "Murat Demir",
              "assigneeRole": "sitemanager",
              "reportedBy": "Selim Kaya (Mühendis)",
              "fidicClause": "Md. 7.6",
              "dueDate": "2026-11-25",
              "status": "open",
              "noteTr": "Yağmur sızdırmazlık testi öncesi EPDM fitil tamamlanacak."
            },
            {
              "id": "E-103",
              "projectId": "prj-tower",
              "xPct": 48.0,
              "yPct": 48.0,
              "zone": "Çekirdek & Yangın Holü",
              "titleTr": "Yangın Kapısı Duman Contası ve Panik Bar Ayarı Tamamlandı",
              "titleEn": "Fire Door Intumescent Seal & Panic Bar Adjustment",
              "severity": "normal",
              "assigneeName": "Hasan Usta",
              "assigneeRole": "master",
              "reportedBy": "Zeynep Arslan (Baş Mimar)",
              "fidicClause": "Md. 11.1",
              "dueDate": "2026-11-20",
              "status": "closed",
              "noteTr": "Mimar ve İSG uzmanı tarafından yerinde test edilip kapatıldı."
            }
          ],
          "feedbacks": [
            {
              "id": "fb-1",
              "projectId": "prj-tower",
              "author": "Mehmet Zencir (Yatırımcı)",
              "role": "employer",
              "target": "Zeynep Arslan & Murat Demir",
              "zone": "Podyum Giriş Lobisi",
              "type": "Geri Bildirim",
              "createdAt": "2026-11-22 09:10",
              "messageTr": "Podyum ana giriş lobisindeki aydınlatma sıcaklığı 4000K yerine 3000K sıcak günışığı olmalı; doğaltaş dokusunu çok daha kaliteli gösteriyor. Numuneyi sahada birlikte görelim.",
              "replyTr": "Zeynep Arslan (Mimar): Rev.02 aydınlatma listesini 3000K CRI>90 olarak güncelledik, yarın saat 14:00'te lobide canlı numune yakacağız.",
              "status": "answered"
            },
            {
              "id": "fb-2",
              "projectId": "prj-tower",
              "author": "Hasan Usta (Seramik Ekipbaşı)",
              "role": "master",
              "target": "Zeynep Arslan (Baş Mimar)",
              "zone": "A-Kule 3. Kat Mahal A-102",
              "type": "Saha Teknik Sorusu (RFI)",
              "createdAt": "2026-11-22 08:45",
              "messageTr": "Mimarım, A-102 banyo niş içinde seramik derz çizgisini gömme rezervuar aksına ortalayalım mı yoksa sol duvardan tam plaka mı başlayalım?",
              "replyTr": "Zeynep Arslan (Mimar): Gömme rezervuar ve lavabo aksına tam simetrik ortalayalım Hasan Usta, kenar kesimler 30 cm üzerinde kalıyor, çok temiz durur.",
              "status": "answered"
            }
          ],
          "media": [
            {
              "id": "med-1",
              "projectId": "prj-tower",
              "kind": "blueprint",
              "discipline": "Mimari",
              "revision": "Rev.02 (Sahada Geçerli)",
              "isCurrent": true,
              "titleTr": "A-Kule Tip Kat Mimari Uygulama & Mahal Kontrol Paftası",
              "zone": "A-Kule Kat 1–8",
              "uploadedBy": "Zeynep Arslan",
              "date": "2026-11-20",
              "url": "/samples/kat_plani_rev02.svg",
              "fidicClause": "Md. 1.8 & 5.2"
            },
            {
              "id": "med-2",
              "projectId": "prj-tower",
              "kind": "photo",
              "discipline": "Saha İlerleme Fotosu",
              "revision": "Canlı Kayıt",
              "isCurrent": true,
              "titleTr": "Mahal A-102 Su Yalıtımı & Kat Planı Referans Görünümü",
              "zone": "A-Kule Kat 3",
              "uploadedBy": "Hasan Usta",
              "date": "2026-11-22",
              "url": "/samples/kat_plani_rev02.svg",
              "fidicClause": "Md. 4.20 & 7.3"
            }
          ],
          "notices": [
            {
              "id": "FIDIC-N-01",
              "projectId": "prj-tower",
              "clause": "Madde 20.2.1 & 4.12",
              "typeTr": "Hak Talebi İlk Bildirimi (28 Gün Time-Bar Kalkanı)",
              "titleTr": "B-Blok Kuzey Temel Aksında Öngörülemeyen Bazalt Kaya Formasyonu",
              "eventDate": "2026-11-05",
              "deadlineDate": "2026-12-03",
              "daysLeft": 11,
              "entitlement": "T + C (Süre + Maliyet)",
              "owner": "Selim Kaya / Murat Demir",
              "status": "active_warning"
            },
            {
              "id": "FIDIC-N-02",
              "projectId": "prj-tower",
              "clause": "Madde 14.6",
              "typeTr": "Ara Hakediş Belgesi (IPC #14) Düzenleme Süresi",
              "titleTr": "Kasım Dönemi 22.400.000 ₺ Hakediş Beyanının Mühendisce Onaylanması",
              "eventDate": "2026-11-10",
              "deadlineDate": "2026-12-08",
              "daysLeft": 16,
              "entitlement": "28 Gün Yasal Süre",
              "owner": "Selim Kaya (FIDIC Mühendisi)",
              "status": "on_track"
            },
            {
              "id": "FIDIC-N-03",
              "projectId": "prj-tower",
              "clause": "Madde 8.4",
              "typeTr": "Erken Uyarı Bildirimi (Advance Warning)",
              "titleTr": "İthal Asansör Ray Tedarikinde Gümrük Bekleme İhtimali — Alternatif Rota Planı",
              "eventDate": "2026-11-19",
              "deadlineDate": "2026-11-28",
              "daysLeft": 6,
              "entitlement": "Önleyici Koordinasyon Toplantısı (Md. 3.8)",
              "owner": "Murat Demir",
              "status": "active_warning"
            }
          ],
          "ipcList": [
            { "no": "IPC #12", "projectId": "prj-tower", "period": "Eylül 2026", "gross": 24800000, "priceAdjPn": 1.084, "retention": 1240000, "netPayable": 25643200, "status": "Ödendi (Md. 14.7)" },
            { "no": "IPC #13", "projectId": "prj-tower", "period": "Ekim 2026", "gross": 19600000, "priceAdjPn": 1.092, "retention": 980000, "netPayable": 20423200, "status": "Onaylandı • Ödeme Vadesi 04 Ara" },
            { "no": "IPC #14", "projectId": "prj-tower", "period": "Kasım 2026", "gross": 22400000, "priceAdjPn": 1.105, "retention": 1120000, "netPayable": 23632000, "status": "Mühendis İncelemesinde (Md. 14.6)" }
          ]
        }
        """;

        return (JsonObject)JsonNode.Parse(json)!;
    }
}
