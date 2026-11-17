// An offline list of places people dream of visiting, so a "📍 Kyoto" line
// lands on the map without asking a web service. Countries come from
// world-data.js; this file adds cities, islands, parks and famous sights.
// Checked against Natural Earth country shapes by tools/check-gazetteer.mjs.
import { COUNTRIES } from "./world-data.js";

// Name|Country as Natural Earth names it|latitude|longitude|other names
const PLACES = `
Tokyo|Japan|35.6762|139.6503|
Kyoto|Japan|35.0116|135.7681|
Osaka|Japan|34.6937|135.5023|
Nara|Japan|34.6851|135.8048|
Hiroshima|Japan|34.3853|132.4553|
Miyajima|Japan|34.2959|132.3199|itsukushima
Sapporo|Japan|43.0618|141.3545|
Hokkaido|Japan|43.2203|142.8635|
Niseko|Japan|42.8048|140.6874|
Mount Fuji|Japan|35.3606|138.7274|fuji;mt fuji;fujisan
Hakone|Japan|35.2324|139.1069|
Okinawa|Japan|26.2124|127.6809|naha
Fukuoka|Japan|33.5904|130.4017|
Nagoya|Japan|35.1815|136.9066|
Kanazawa|Japan|36.5613|136.6562|
Takayama|Japan|36.1461|137.2522|
Nikko|Japan|36.7199|139.6982|
Yokohama|Japan|35.4437|139.6380|
Kobe|Japan|34.6901|135.1955|
Beijing|China|39.9042|116.4074|peking
Shanghai|China|31.2304|121.4737|
Great Wall of China|China|40.4319|116.5704|great wall;the great wall
Xi'an|China|34.3416|108.9398|xian
Guilin|China|25.2736|110.2900|
Yangshuo|China|24.7781|110.4966|
Chengdu|China|30.5728|104.0668|
Zhangjiajie|China|29.1170|110.4793|avatar mountains
Hangzhou|China|30.2741|120.1551|
Shenzhen|China|22.5431|114.0579|
Guangzhou|China|23.1291|113.2644|canton
Lhasa|China|29.6520|91.1721|tibet
Harbin|China|45.8038|126.5349|
Hong Kong|Hong Kong|22.3193|114.1694|hk
Macau|Macao|22.1987|113.5439|macao
Taipei|Taiwan|25.0330|121.5654|
Seoul|South Korea|37.5665|126.9780|
Busan|South Korea|35.1796|129.0756|pusan
Jeju Island|South Korea|33.4996|126.5312|jeju
Ulaanbaatar|Mongolia|47.8864|106.9057|ulan bator
Bangkok|Thailand|13.7563|100.5018|
Chiang Mai|Thailand|18.7883|98.9853|
Phuket|Thailand|7.8804|98.3923|
Krabi|Thailand|8.0863|98.9063|railay
Koh Samui|Thailand|9.5120|100.0136|ko samui
Phi Phi Islands|Thailand|7.7407|98.7784|koh phi phi;phi phi
Singapore|Singapore|1.3521|103.8198|
Kuala Lumpur|Malaysia|3.1390|101.6869|kl
Penang|Malaysia|5.4164|100.3327|george town
Langkawi|Malaysia|6.3500|99.8000|
Kota Kinabalu|Malaysia|5.9804|116.0735|borneo
Bali|Indonesia|-8.3405|115.0920|
Ubud|Indonesia|-8.5069|115.2625|
Jakarta|Indonesia|-6.2088|106.8456|
Yogyakarta|Indonesia|-7.7956|110.3695|jogja;borobudur
Komodo Island|Indonesia|-8.5500|119.4890|komodo
Lombok|Indonesia|-8.6500|116.3249|
Gili Islands|Indonesia|-8.3500|116.0600|gili;gili trawangan
Raja Ampat|Indonesia|-0.2346|130.5079|
Manila|Philippines|14.5995|120.9842|
Palawan|Philippines|9.8349|118.7384|
El Nido|Philippines|11.1784|119.3930|
Boracay|Philippines|11.9674|121.9248|
Cebu|Philippines|10.3157|123.8854|
Siargao|Philippines|9.8482|126.0458|
Hanoi|Vietnam|21.0278|105.8342|
Ho Chi Minh City|Vietnam|10.8231|106.6297|saigon
Ha Long Bay|Vietnam|20.9101|107.1839|halong bay
Hoi An|Vietnam|15.8801|108.3380|
Da Nang|Vietnam|16.0544|108.2022|danang
Hue|Vietnam|16.4637|107.5909|
Sapa|Vietnam|22.3364|103.8438|
Phnom Penh|Cambodia|11.5564|104.9282|
Siem Reap|Cambodia|13.3671|103.8448|
Angkor Wat|Cambodia|13.4125|103.8670|angkor
Vientiane|Laos|17.9757|102.6331|
Luang Prabang|Laos|19.8856|102.1347|
Yangon|Myanmar|16.8409|96.1735|rangoon
Bagan|Myanmar|21.1717|94.8585|
Mandalay|Myanmar|21.9588|96.0891|
Bandar Seri Begawan|Brunei|4.9031|114.9398|
New Delhi|India|28.6139|77.2090|delhi
Mumbai|India|19.0760|72.8777|bombay
Agra|India|27.1767|78.0081|
Taj Mahal|India|27.1751|78.0421|
Jaipur|India|26.9124|75.7873|
Udaipur|India|24.5854|73.7125|
Jodhpur|India|26.2389|73.0243|
Varanasi|India|25.3176|82.9739|benares
Goa|India|15.2993|74.1240|
Kerala|India|10.8505|76.2711|
Bangalore|India|12.9716|77.5946|bengaluru
Chennai|India|13.0827|80.2707|madras
Kolkata|India|22.5726|88.3639|calcutta
Hyderabad|India|17.3850|78.4867|
Amritsar|India|31.6340|74.8723|golden temple
Rishikesh|India|30.0869|78.2676|
Ladakh|India|34.1526|77.5771|leh
Darjeeling|India|27.0410|88.2663|
Kathmandu|Nepal|27.7172|85.3240|
Pokhara|Nepal|28.2096|83.9856|
Mount Everest|Nepal|27.9881|86.9250|everest;everest base camp
Thimphu|Bhutan|27.4728|89.6390|
Paro|Bhutan|27.4305|89.4167|tiger's nest
Colombo|Sri Lanka|6.9271|79.8612|
Sigiriya|Sri Lanka|7.9570|80.7603|
Kandy|Sri Lanka|7.2906|80.6337|
Ella|Sri Lanka|6.8667|81.0466|
Galle|Sri Lanka|6.0535|80.2210|
Malé|Maldives|4.1755|73.5093|male
Dhaka|Bangladesh|23.8103|90.4125|
Karachi|Pakistan|24.8607|67.0011|
Lahore|Pakistan|31.5204|74.3587|
Islamabad|Pakistan|33.6844|73.0479|
Hunza Valley|Pakistan|36.3167|74.6500|hunza
Samarkand|Uzbekistan|39.6270|66.9750|
Almaty|Kazakhstan|43.2220|76.8512|
Dubai|United Arab Emirates|25.2048|55.2708|
Abu Dhabi|United Arab Emirates|24.4539|54.3773|
Doha|Qatar|25.2854|51.5310|
Muscat|Oman|23.5880|58.3829|
Petra|Jordan|30.3285|35.4444|
Wadi Rum|Jordan|29.5730|35.4210|
Amman|Jordan|31.9454|35.9284|
Dead Sea|Jordan|31.5590|35.5732|
Jerusalem|Israel|31.7683|35.2137|
Tel Aviv|Israel|32.0853|34.7818|
Beirut|Lebanon|33.8938|35.5018|
Istanbul|Turkey|41.0082|28.9784|constantinople
Cappadocia|Turkey|38.6431|34.8289|goreme
Antalya|Turkey|36.8969|30.7133|
Pamukkale|Turkey|37.9137|29.1187|
Ephesus|Turkey|37.9411|27.3419|
Bodrum|Turkey|37.0344|27.4305|
Ankara|Turkey|39.9334|32.8597|
Tehran|Iran|35.6892|51.3890|
Isfahan|Iran|32.6546|51.6680|
Shiraz|Iran|29.5918|52.5837|
Riyadh|Saudi Arabia|24.7136|46.6753|
AlUla|Saudi Arabia|26.6085|37.9232|al ula
Jeddah|Saudi Arabia|21.4858|39.1925|
Mecca|Saudi Arabia|21.3891|39.8579|makkah
Baghdad|Iraq|33.3152|44.3661|
Kuwait City|Kuwait|29.3759|47.9774|
Manama|Bahrain|26.2285|50.5860|
Socotra|Yemen|12.4634|53.8237|
Tbilisi|Georgia|41.7151|44.8271|
Yerevan|Armenia|40.1792|44.4991|
Baku|Azerbaijan|40.4093|49.8671|
Paris|France|48.8566|2.3522|
Nice|France|43.7102|7.2620|
Lyon|France|45.7640|4.8357|
Marseille|France|43.2965|5.3698|
Bordeaux|France|44.8378|-0.5792|
Provence|France|43.9493|6.0679|lavender fields
Mont Saint-Michel|France|48.6361|-1.5115|mont st michel
Chamonix|France|45.9237|6.8694|
Mont Blanc|France|45.8326|6.8652|
Loire Valley|France|47.3941|0.6848|loire
Normandy|France|49.1829|-0.3707|
Corsica|France|42.0396|9.0129|
Strasbourg|France|48.5734|7.7521|
Versailles|France|48.8049|2.1204|
Saint-Tropez|France|43.2727|6.6406|st tropez
Cannes|France|43.5528|7.0174|
French Riviera|France|43.7000|7.2700|cote d'azur
Reims|France|49.2583|4.0317|champagne
Monaco|Monaco|43.7384|7.4246|monte carlo
London|United Kingdom|51.5074|-0.1278|
Edinburgh|United Kingdom|55.9533|-3.1883|
Scottish Highlands|United Kingdom|57.1200|-4.7100|highlands
Isle of Skye|United Kingdom|57.2736|-6.2153|skye
Loch Ness|United Kingdom|57.3229|-4.4244|
Glasgow|United Kingdom|55.8642|-4.2518|
Manchester|United Kingdom|53.4808|-2.2426|
Liverpool|United Kingdom|53.4084|-2.9916|
Oxford|United Kingdom|51.7520|-1.2577|
Cambridge|United Kingdom|52.2053|0.1218|
Bath|United Kingdom|51.3811|-2.3590|
Stonehenge|United Kingdom|51.1789|-1.8262|
Cornwall|United Kingdom|50.2660|-5.0527|
Lake District|United Kingdom|54.4609|-3.0886|
Cotswolds|United Kingdom|51.8330|-1.8433|
York|United Kingdom|53.9599|-1.0873|
Brighton|United Kingdom|50.8225|-0.1372|
Cardiff|United Kingdom|51.4816|-3.1791|
Belfast|United Kingdom|54.5973|-5.9301|
Giant's Causeway|United Kingdom|55.2408|-6.5116|
England|United Kingdom|52.3555|-1.1743|
Scotland|United Kingdom|56.4907|-4.2026|
Wales|United Kingdom|52.1307|-3.7837|
Dublin|Ireland|53.3498|-6.2603|
Galway|Ireland|53.2707|-9.0568|
Cliffs of Moher|Ireland|52.9715|-9.4309|
Killarney|Ireland|52.0599|-9.5044|ring of kerry;kerry
Cork|Ireland|51.8985|-8.4756|
Dingle|Ireland|52.1408|-10.2687|
Reykjavík|Iceland|64.1466|-21.9426|reykjavik
Blue Lagoon|Iceland|63.8804|-22.4495|
Jökulsárlón|Iceland|64.0784|-16.2306|glacier lagoon;jokulsarlon
Vík|Iceland|63.4186|-19.0060|vik
Akureyri|Iceland|65.6885|-18.1262|
Golden Circle|Iceland|64.3271|-20.1199|
Faroe Islands|Faeroe Is.|62.0079|-6.7900|faroes;torshavn
Nuuk|Greenland|64.1814|-51.6941|
Ilulissat|Greenland|69.2198|-51.0986|
Oslo|Norway|59.9139|10.7522|
Bergen|Norway|60.3913|5.3221|
Tromsø|Norway|69.6492|18.9553|tromso;northern lights;aurora borealis
Lofoten Islands|Norway|68.2152|14.2110|lofoten
Geirangerfjord|Norway|62.1049|7.0941|geiranger;fjords;norwegian fjords
Preikestolen|Norway|58.9864|6.1904|pulpit rock
Flåm|Norway|60.8628|7.1137|flam
Svalbard|Norway|78.2232|15.6267|longyearbyen
Stockholm|Sweden|59.3293|18.0686|
Gothenburg|Sweden|57.7089|11.9746|goteborg
Kiruna|Sweden|67.8558|20.2253|ice hotel
Abisko|Sweden|68.3495|18.8312|
Helsinki|Finland|60.1699|24.9384|
Rovaniemi|Finland|66.5039|25.7294|lapland;santa claus village
Copenhagen|Denmark|55.6761|12.5683|
Aarhus|Denmark|56.1629|10.2039|
Amsterdam|Netherlands|52.3676|4.9041|
Rotterdam|Netherlands|51.9244|4.4777|
The Hague|Netherlands|52.0705|4.3007|den haag
Keukenhof|Netherlands|52.2697|4.5462|tulip fields;tulips
Brussels|Belgium|50.8503|4.3517|
Bruges|Belgium|51.2093|3.2247|brugge
Ghent|Belgium|51.0543|3.7174|
Antwerp|Belgium|51.2194|4.4025|
Berlin|Germany|52.5200|13.4050|
Munich|Germany|48.1351|11.5820|munchen;oktoberfest
Hamburg|Germany|53.5511|9.9937|
Cologne|Germany|50.9375|6.9603|koln
Frankfurt|Germany|50.1109|8.6821|
Neuschwanstein Castle|Germany|47.5576|10.7498|neuschwanstein
Black Forest|Germany|48.0000|8.2000|schwarzwald
Heidelberg|Germany|49.3988|8.6724|
Dresden|Germany|51.0504|13.7373|
Rothenburg ob der Tauber|Germany|49.3772|10.1786|rothenburg
Bavaria|Germany|48.7904|11.4979|
Vienna|Austria|48.2082|16.3738|wien
Salzburg|Austria|47.8095|13.0550|
Hallstatt|Austria|47.5622|13.6493|
Innsbruck|Austria|47.2692|11.4041|
Zurich|Switzerland|47.3769|8.5417|zürich
Geneva|Switzerland|46.2044|6.1432|geneve
Lucerne|Switzerland|47.0502|8.3093|luzern
Interlaken|Switzerland|46.6863|7.8632|
Zermatt|Switzerland|46.0207|7.7491|matterhorn
Swiss Alps|Switzerland|46.5600|8.5600|alps;the alps
Grindelwald|Switzerland|46.6242|8.0414|
Lauterbrunnen|Switzerland|46.5935|7.9091|
Jungfraujoch|Switzerland|46.5475|7.9852|jungfrau
St. Moritz|Switzerland|46.4908|9.8355|st moritz;saint moritz
Bern|Switzerland|46.9480|7.4474|
Lugano|Switzerland|46.0037|8.9511|
Rome|Italy|41.9028|12.4964|roma
Venice|Italy|45.4408|12.3155|venezia
Florence|Italy|43.7696|11.2558|firenze
Milan|Italy|45.4642|9.1900|milano
Naples|Italy|40.8518|14.2681|napoli
Amalfi Coast|Italy|40.6340|14.6027|amalfi
Positano|Italy|40.6281|14.4850|
Capri|Italy|40.5532|14.2222|
Cinque Terre|Italy|44.1461|9.6439|
Lake Como|Italy|46.0160|9.2572|como;bellagio
Tuscany|Italy|43.4000|11.1000|toscana
Siena|Italy|43.3188|11.3308|
Pisa|Italy|43.7228|10.4017|
Dolomites|Italy|46.4102|11.8440|dolomiti
Sicily|Italy|37.5999|14.0154|sicilia
Palermo|Italy|38.1157|13.3615|
Taormina|Italy|37.8516|15.2853|
Sardinia|Italy|40.1209|9.0129|sardegna
Verona|Italy|45.4384|10.9916|
Bologna|Italy|44.4949|11.3426|
Lake Garda|Italy|45.6000|10.6700|garda
Pompeii|Italy|40.7462|14.4989|
Matera|Italy|40.6664|16.6043|
Puglia|Italy|40.7900|17.1000|apulia
Turin|Italy|45.0703|7.6869|torino
Genoa|Italy|44.4056|8.9463|genova
Vatican City|Vatican|41.9029|12.4534|vatican
San Marino|San Marino|43.9424|12.4578|
Barcelona|Spain|41.3851|2.1734|
Madrid|Spain|40.4168|-3.7038|
Seville|Spain|37.3891|-5.9845|sevilla
Granada|Spain|37.1773|-3.5986|alhambra
Valencia|Spain|39.4699|-0.3763|
Málaga|Spain|36.7213|-4.4214|malaga
Ibiza|Spain|38.9067|1.4206|
Mallorca|Spain|39.6953|3.0176|majorca;palma
Menorca|Spain|39.9496|4.1104|minorca
Tenerife|Spain|28.2916|-16.6291|
Gran Canaria|Spain|27.9202|-15.5474|
Canary Islands|Spain|28.1000|-15.9000|canaries
Lanzarote|Spain|29.0469|-13.5900|
San Sebastián|Spain|43.3183|-1.9812|san sebastian;donostia
Bilbao|Spain|43.2630|-2.9350|
Córdoba|Spain|37.8882|-4.7794|cordoba
Toledo|Spain|39.8628|-4.0273|
Santiago de Compostela|Spain|42.8782|-8.5448|camino de santiago
Andalusia|Spain|37.5443|-4.7278|andalucia
Lisbon|Portugal|38.7223|-9.1393|lisboa
Porto|Portugal|41.1579|-8.6291|oporto
Sintra|Portugal|38.8029|-9.3817|
Lagos|Portugal|37.1028|-8.6730|algarve
Madeira|Portugal|32.7607|-16.9595|funchal
Azores|Portugal|37.7412|-25.6756|sao miguel
Douro Valley|Portugal|41.1621|-7.7883|douro
Athens|Greece|37.9838|23.7275|athina
Santorini|Greece|36.3932|25.4615|thira;oia
Mykonos|Greece|37.4467|25.3289|
Crete|Greece|35.2401|24.8093|
Rhodes|Greece|36.4341|28.2176|
Corfu|Greece|39.6243|19.9217|
Meteora|Greece|39.7217|21.6306|
Zakynthos|Greece|37.7870|20.8999|zante;navagio
Naxos|Greece|37.1036|25.3763|
Paros|Greece|37.0853|25.1515|
Milos|Greece|36.7444|24.4290|
Thessaloniki|Greece|40.6401|22.9444|
Delphi|Greece|38.4824|22.5010|
Dubrovnik|Croatia|42.6507|18.0944|
Split|Croatia|43.5081|16.4402|
Hvar|Croatia|43.1729|16.4411|
Plitvice Lakes|Croatia|44.8654|15.5820|plitvice
Zagreb|Croatia|45.8150|15.9819|
Zadar|Croatia|44.1194|15.2314|
Lake Bled|Slovenia|46.3683|14.1146|bled
Ljubljana|Slovenia|46.0569|14.5058|
Kotor|Montenegro|42.4247|18.7712|bay of kotor
Tirana|Albania|41.3275|19.8187|
Ksamil|Albania|39.7769|20.0003|albanian riviera
Prague|Czechia|50.0755|14.4378|praha
Český Krumlov|Czechia|48.8127|14.3175|cesky krumlov
Budapest|Hungary|47.4979|19.0402|
Kraków|Poland|50.0647|19.9450|krakow;cracow
Warsaw|Poland|52.2297|21.0122|warszawa
Gdańsk|Poland|54.3520|18.6466|gdansk
Bucharest|Romania|44.4268|26.1025|
Brașov|Romania|45.6427|25.5887|brasov;transylvania
Bran Castle|Romania|45.5152|25.3672|dracula's castle
Sofia|Bulgaria|42.6977|23.3219|
Belgrade|Serbia|44.7866|20.4489|beograd
Sarajevo|Bosnia and Herz.|43.8563|18.4131|
Mostar|Bosnia and Herz.|43.3438|17.8078|
Skopje|Macedonia|41.9981|21.4254|
Ohrid|Macedonia|41.1231|20.8016|
Tallinn|Estonia|59.4370|24.7536|
Riga|Latvia|56.9496|24.1052|
Vilnius|Lithuania|54.6872|25.2797|
Moscow|Russia|55.7558|37.6173|moskva
Saint Petersburg|Russia|59.9311|30.3609|st petersburg;st. petersburg
Lake Baikal|Russia|53.5587|108.1650|baikal
Kamchatka|Russia|53.0452|158.6483|
Kyiv|Ukraine|50.4501|30.5234|kiev
Lviv|Ukraine|49.8397|24.0297|
Odesa|Ukraine|46.4825|30.7233|odessa
Minsk|Belarus|53.9045|27.5615|
Chișinău|Moldova|47.0105|28.8638|chisinau
Valletta|Malta|35.8989|14.5146|
Gozo|Malta|36.0443|14.2512|
Paphos|Cyprus|34.7720|32.4297|
Ayia Napa|Cyprus|34.9823|34.0018|
Andorra la Vella|Andorra|42.5063|1.5218|
Vaduz|Liechtenstein|47.1410|9.5209|
Luxembourg City|Luxembourg|49.6116|6.1319|
Marrakech|Morocco|31.6295|-7.9811|marrakesh
Fes|Morocco|34.0181|-5.0078|fez
Chefchaouen|Morocco|35.1688|-5.2636|blue city
Casablanca|Morocco|33.5731|-7.5898|
Rabat|Morocco|34.0209|-6.8416|
Essaouira|Morocco|31.5085|-9.7595|
Merzouga|Morocco|31.0802|-4.0133|sahara;sahara desert
Atlas Mountains|Morocco|31.0600|-7.9150|atlas
Cairo|Egypt|30.0444|31.2357|
Pyramids of Giza|Egypt|29.9792|31.1342|giza;pyramids;the pyramids
Luxor|Egypt|25.6872|32.6396|valley of the kings
Aswan|Egypt|24.0889|32.8998|
Abu Simbel|Egypt|22.3372|31.6258|
Alexandria|Egypt|31.2001|29.9187|
Sharm El Sheikh|Egypt|27.9158|34.3300|sharm
Dahab|Egypt|28.5091|34.5136|
Hurghada|Egypt|27.2579|33.8116|
Tunis|Tunisia|36.8065|10.1815|
Sidi Bou Said|Tunisia|36.8687|10.3417|
Nairobi|Kenya|-1.2921|36.8219|
Maasai Mara|Kenya|-1.4061|35.0089|masai mara
Mombasa|Kenya|-4.0435|39.6682|
Diani Beach|Kenya|-4.2798|39.5950|diani
Amboseli|Kenya|-2.6527|37.2606|
Lamu|Kenya|-2.2717|40.9020|
Serengeti|Tanzania|-2.3333|34.8333|
Zanzibar|Tanzania|-6.1659|39.2026|stone town
Mount Kilimanjaro|Tanzania|-3.0674|37.3556|kilimanjaro
Ngorongoro Crater|Tanzania|-3.2000|35.5000|ngorongoro
Dar es Salaam|Tanzania|-6.7924|39.2083|
Arusha|Tanzania|-3.3869|36.6830|
Kampala|Uganda|0.3476|32.5825|
Bwindi|Uganda|-1.0500|29.6167|bwindi impenetrable forest
Kigali|Rwanda|-1.9441|30.0619|
Volcanoes National Park|Rwanda|-1.4833|29.5333|mountain gorillas;gorillas
Addis Ababa|Ethiopia|9.0300|38.7400|
Lalibela|Ethiopia|12.0317|39.0476|
Cape Town|South Africa|-33.9249|18.4241|
Table Mountain|South Africa|-33.9628|18.4098|
Cape of Good Hope|South Africa|-34.3568|18.4740|
Stellenbosch|South Africa|-33.9321|18.8602|
Johannesburg|South Africa|-26.2041|28.0473|joburg
Kruger National Park|South Africa|-23.9884|31.5547|kruger
Durban|South Africa|-29.8587|31.0218|
Knysna|South Africa|-34.0363|23.0471|garden route
Drakensberg|South Africa|-28.7500|28.9500|
Sossusvlei|Namibia|-24.7275|15.3426|deadvlei;namib desert
Windhoek|Namibia|-22.5609|17.0658|
Etosha|Namibia|-18.8556|16.3293|
Okavango Delta|Botswana|-19.2836|22.5950|okavango
Chobe|Botswana|-18.6000|24.5000|
Victoria Falls|Zimbabwe|-17.9318|25.8307|vic falls
Harare|Zimbabwe|-17.8252|31.0335|
Lusaka|Zambia|-15.3875|28.3228|
Antananarivo|Madagascar|-18.8792|47.5079|tana
Avenue of the Baobabs|Madagascar|-20.2507|44.4185|baobabs;morondava
Nosy Be|Madagascar|-13.3333|48.2667|
Mauritius|Mauritius|-20.3484|57.5522|
Mahé|Seychelles|-4.6796|55.4920|mahe
La Digue|Seychelles|-4.3590|55.8410|
Réunion|France|-21.1151|55.5364|reunion
Praia|Cabo Verde|14.9330|-23.5133|
Accra|Ghana|5.6037|-0.1870|
Lagos, Nigeria|Nigeria|6.5244|3.3792|
Abuja|Nigeria|9.0765|7.3986|
Dakar|Senegal|14.7167|-17.4677|
Timbuktu|Mali|16.7666|-3.0026|
Algiers|Algeria|36.7538|3.0588|
Tripoli|Libya|32.8872|13.1913|
Khartoum|Sudan|15.5007|32.5599|
Maputo|Mozambique|-25.9692|32.5732|
Tofo|Mozambique|-23.8500|35.5400|tofo beach
Bazaruto|Mozambique|-21.6500|35.4500|
Cape Maclear|Malawi|-14.0200|34.8400|lake malawi
Luanda|Angola|-8.8390|13.2894|
Kinshasa|Dem. Rep. Congo|-4.4419|15.2663|
Abidjan|Côte d'Ivoire|5.3600|-4.0083|
Mogadishu|Somalia|2.0469|45.3182|
Libreville|Gabon|0.4162|9.4673|
New York City|United States of America|40.7128|-74.0060|new york;nyc;manhattan;brooklyn
Los Angeles|United States of America|34.0522|-118.2437|la;hollywood
San Francisco|United States of America|37.7749|-122.4194|sf
Chicago|United States of America|41.8781|-87.6298|
Miami|United States of America|25.7617|-80.1918|
Las Vegas|United States of America|36.1699|-115.1398|vegas
Seattle|United States of America|47.6062|-122.3321|
Boston|United States of America|42.3601|-71.0589|
Washington, D.C.|United States of America|38.9072|-77.0369|washington dc;dc
New Orleans|United States of America|29.9511|-90.0715|nola
Nashville|United States of America|36.1627|-86.7816|
Austin|United States of America|30.2672|-97.7431|
Denver|United States of America|39.7392|-104.9903|
Portland|United States of America|45.5152|-122.6784|
San Diego|United States of America|32.7157|-117.1611|
Honolulu|United States of America|21.3069|-157.8583|oahu;waikiki
Maui|United States of America|20.7984|-156.3319|hawaii
Kauai|United States of America|22.0964|-159.5261|
Big Island|United States of America|19.5429|-155.6659|hawaii island
Alaska|United States of America|61.2181|-149.9003|anchorage
Denali|United States of America|63.0692|-151.0070|
Juneau|United States of America|58.3019|-134.4197|
Yosemite|United States of America|37.8651|-119.5383|yosemite national park
Grand Canyon|United States of America|36.1069|-112.1129|
Yellowstone|United States of America|44.4280|-110.5885|yellowstone national park
Zion National Park|United States of America|37.2982|-113.0263|zion
Bryce Canyon|United States of America|37.5930|-112.1871|
Arches National Park|United States of America|38.7331|-109.5925|arches;moab
Monument Valley|United States of America|36.9980|-110.0985|
Sedona|United States of America|34.8697|-111.7610|
Antelope Canyon|United States of America|36.8619|-111.3743|
Glacier National Park|United States of America|48.7596|-113.7870|
Grand Teton|United States of America|43.7904|-110.6818|jackson hole
Joshua Tree|United States of America|33.8734|-115.9010|
Death Valley|United States of America|36.5054|-117.0794|
Big Sur|United States of America|36.2704|-121.8081|
Napa Valley|United States of America|38.5025|-122.2654|napa
Lake Tahoe|United States of America|39.0968|-120.0324|tahoe
Palm Springs|United States of America|33.8303|-116.5453|
Santa Barbara|United States of America|34.4208|-119.6982|
Key West|United States of America|24.5551|-81.7800|florida keys
Orlando|United States of America|28.5383|-81.3792|disney world;walt disney world
Disneyland|United States of America|33.8121|-117.9190|
Charleston|United States of America|32.7765|-79.9311|
Savannah|United States of America|32.0809|-81.0912|
Philadelphia|United States of America|39.9526|-75.1652|philly
Atlanta|United States of America|33.7490|-84.3880|
Houston|United States of America|29.7604|-95.3698|
Dallas|United States of America|32.7767|-96.7970|
Phoenix|United States of America|33.4484|-112.0740|
Salt Lake City|United States of America|40.7608|-111.8910|
Aspen|United States of America|39.1911|-106.8175|
Vail|United States of America|39.6403|-106.3742|
Santa Fe|United States of America|35.6870|-105.9378|
Acadia|United States of America|44.3386|-68.2733|acadia national park
Cape Cod|United States of America|41.6688|-70.2962|
Martha's Vineyard|United States of America|41.3805|-70.6455|
Nantucket|United States of America|41.2835|-70.0995|
Silicon Valley|United States of America|37.3875|-122.0575|
California|United States of America|36.7783|-119.4179|
Florida|United States of America|27.6648|-81.5158|
Texas|United States of America|31.9686|-99.9018|
Colorado|United States of America|39.5501|-105.7821|
Utah|United States of America|39.3210|-111.0937|
Arizona|United States of America|34.0489|-111.0937|
Montana|United States of America|46.8797|-110.3626|
Maine|United States of America|45.2538|-69.4455|
Vermont|United States of America|44.5588|-72.5778|
San Juan|Puerto Rico|18.4655|-66.1057|
St. Thomas|U.S. Virgin Is.|18.3358|-64.8963|us virgin islands
Guam|Guam|13.4443|144.7937|
Toronto|Canada|43.6532|-79.3832|
Vancouver|Canada|49.2827|-123.1207|
Montreal|Canada|45.5017|-73.5673|montréal
Quebec City|Canada|46.8139|-71.2080|quebec;québec
Ottawa|Canada|45.4215|-75.6972|
Banff|Canada|51.1784|-115.5708|banff national park
Lake Louise|Canada|51.4254|-116.1773|moraine lake
Jasper|Canada|52.8737|-118.0814|
Whistler|Canada|50.1163|-122.9574|
Victoria|Canada|48.4284|-123.3656|vancouver island
Tofino|Canada|49.1530|-125.9066|
Calgary|Canada|51.0447|-114.0719|
Halifax|Canada|44.6488|-63.5752|nova scotia
Prince Edward Island|Canada|46.5107|-63.4168|pei
Gros Morne|Canada|49.5900|-57.8000|newfoundland
Whitehorse|Canada|60.7212|-135.0568|yukon
Churchill|Canada|58.7684|-94.1650|polar bears
Yellowknife|Canada|62.4540|-114.3718|
Niagara Falls|Canada|43.0828|-79.0742|niagara
British Columbia|Canada|53.7267|-127.6476|bc
Mexico City|Mexico|19.4326|-99.1332|cdmx
Cancún|Mexico|21.1619|-86.8515|cancun
Tulum|Mexico|20.2114|-87.4654|
Playa del Carmen|Mexico|20.6296|-87.0739|
Oaxaca|Mexico|17.0732|-96.7266|
Puerto Vallarta|Mexico|20.6534|-105.2253|
Los Cabos|Mexico|22.8905|-109.9167|cabo;cabo san lucas
Chichén Itzá|Mexico|20.6843|-88.5678|chichen itza
Guadalajara|Mexico|20.6597|-103.3496|
San Miguel de Allende|Mexico|20.9144|-100.7452|
Mérida|Mexico|20.9674|-89.5926|merida
Holbox|Mexico|21.5236|-87.3787|
Cozumel|Mexico|20.4230|-86.9223|
Bacalar|Mexico|18.6773|-88.3950|
Guanajuato|Mexico|21.0190|-101.2574|
Sayulita|Mexico|20.8691|-105.4408|
Copper Canyon|Mexico|27.5000|-107.7500|barrancas del cobre
Belize City|Belize|17.5046|-88.1962|
Great Blue Hole|Belize|17.3159|-87.5346|blue hole
Ambergris Caye|Belize|17.9214|-87.9611|san pedro
Antigua Guatemala|Guatemala|14.5586|-90.7295|
Lake Atitlán|Guatemala|14.6907|-91.2025|atitlan
Tikal|Guatemala|17.2220|-89.6237|
San José|Costa Rica|9.9281|-84.0907|san jose
Arenal|Costa Rica|10.4626|-84.7032|arenal volcano;la fortuna
Monteverde|Costa Rica|10.3010|-84.8250|
Manuel Antonio|Costa Rica|9.3921|-84.1370|
Tamarindo|Costa Rica|10.2993|-85.8371|
Panama City|Panama|8.9824|-79.5199|panama canal
San Blas Islands|Panama|9.5667|-78.8167|guna yala;san blas
Bocas del Toro|Panama|9.3403|-82.2420|
Roatán|Honduras|16.3200|-86.5390|roatan
Havana|Cuba|23.1136|-82.3666|la habana
Varadero|Cuba|23.1546|-81.2523|
Viñales|Cuba|22.6167|-83.7167|vinales
Nassau|Bahamas|25.0443|-77.3504|
Exuma|Bahamas|23.6197|-75.9700|exumas;swimming pigs
Montego Bay|Jamaica|18.4762|-77.8939|mobay
Negril|Jamaica|18.2683|-78.3478|
Kingston|Jamaica|17.9714|-76.7920|
Punta Cana|Dominican Rep.|18.5601|-68.3725|
Santo Domingo|Dominican Rep.|18.4861|-69.9312|
Aruba|Aruba|12.5211|-69.9683|
Curaçao|Curaçao|12.1696|-68.9900|curacao
Barbados|Barbados|13.1939|-59.5432|
St. Lucia|Saint Lucia|13.9094|-60.9789|saint lucia;the pitons
Turks and Caicos|Turks and Caicos Is.|21.6940|-71.7979|
Bermuda|Bermuda|32.3078|-64.7505|
Grand Cayman|Cayman Is.|19.3133|-81.2546|cayman islands
British Virgin Islands|British Virgin Is.|18.4207|-64.6400|bvi;tortola
St. Barts|St-Barthélemy|17.9000|-62.8333|st barts;saint barthelemy
Antigua|Antigua and Barb.|17.0608|-61.7964|
Grenada|Grenada|12.1165|-61.6790|
Dominica|Dominica|15.4150|-61.3710|
Martinique|France|14.6415|-61.0242|
Guadeloupe|France|16.2650|-61.5510|
Tobago|Trinidad and Tobago|11.2333|-60.6667|
Rio de Janeiro|Brazil|-22.9068|-43.1729|rio;copacabana
São Paulo|Brazil|-23.5505|-46.6333|sao paulo
Salvador|Brazil|-12.9777|-38.5016|bahia
Florianópolis|Brazil|-27.5954|-48.5480|florianopolis
Amazon Rainforest|Brazil|-3.4653|-62.2159|amazon;the amazon
Manaus|Brazil|-3.1190|-60.0217|
Fernando de Noronha|Brazil|-3.8547|-32.4247|
Lençóis Maranhenses|Brazil|-2.4833|-43.1167|lencois maranhenses
Brasília|Brazil|-15.7975|-47.8919|brasilia
Pantanal|Brazil|-17.0000|-56.5000|
Paraty|Brazil|-23.2178|-44.7131|
Iguazu Falls|Argentina|-25.6953|-54.4367|iguazu;iguacu;iguassu falls
Buenos Aires|Argentina|-34.6037|-58.3816|
Patagonia|Argentina|-50.3402|-72.2648|el calafate
Perito Moreno Glacier|Argentina|-50.4964|-73.1377|perito moreno
El Chaltén|Argentina|-49.3315|-72.8863|el chalten;fitz roy
Ushuaia|Argentina|-54.8019|-68.3030|tierra del fuego
Bariloche|Argentina|-41.1335|-71.3103|
Mendoza|Argentina|-32.8895|-68.8458|
Salta|Argentina|-24.7821|-65.4232|
Córdoba, Argentina|Argentina|-31.4201|-64.1888|
Torres del Paine|Chile|-50.9423|-73.4068|
Santiago|Chile|-33.4489|-70.6693|santiago de chile
Valparaíso|Chile|-33.0472|-71.6127|valparaiso
Atacama Desert|Chile|-22.9087|-68.1997|atacama;san pedro de atacama
Easter Island|Chile|-27.1127|-109.3497|rapa nui
Chiloé|Chile|-42.6000|-73.9333|chiloe
Lima|Peru|-12.0464|-77.0428|
Cusco|Peru|-13.5320|-71.9675|cuzco
Machu Picchu|Peru|-13.1631|-72.5450|
Sacred Valley|Peru|-13.3333|-72.0833|
Lake Titicaca|Peru|-15.8400|-70.0200|titicaca;puno
Rainbow Mountain|Peru|-13.8694|-71.3031|vinicunca
Arequipa|Peru|-16.4090|-71.5375|
Huacachina|Peru|-14.0875|-75.7626|
Nazca Lines|Peru|-14.7390|-75.1300|nazca
Bogotá|Colombia|4.7110|-74.0721|bogota
Cartagena|Colombia|10.3910|-75.4794|
Medellín|Colombia|6.2442|-75.5812|medellin
Tayrona|Colombia|11.3089|-73.9653|
Cali|Colombia|3.4516|-76.5320|
Quito|Ecuador|-0.1807|-78.4678|
Galápagos Islands|Ecuador|-0.9538|-90.9656|galapagos;galápagos
Baños|Ecuador|-1.3928|-78.4269|banos
La Paz|Bolivia|-16.4897|-68.1193|
Salar de Uyuni|Bolivia|-20.1338|-67.4891|uyuni;salt flats
Sucre|Bolivia|-19.0196|-65.2619|
Montevideo|Uruguay|-34.9011|-56.1645|
Punta del Este|Uruguay|-34.9475|-54.9338|
Colonia del Sacramento|Uruguay|-34.4626|-57.8400|colonia
Asunción|Paraguay|-25.2637|-57.5759|asuncion
Caracas|Venezuela|10.4806|-66.9036|
Angel Falls|Venezuela|5.9701|-62.5362|salto angel
Los Roques|Venezuela|11.8500|-66.7500|
Kaieteur Falls|Guyana|5.1750|-59.4800|
Paramaribo|Suriname|5.8520|-55.2038|
Stanley|Falkland Is.|-51.7963|-59.5236|
Sydney|Australia|-33.8688|151.2093|
Melbourne|Australia|-37.8136|144.9631|
Brisbane|Australia|-27.4698|153.0251|
Perth|Australia|-31.9505|115.8605|
Adelaide|Australia|-34.9285|138.6007|
Gold Coast|Australia|-28.0167|153.4000|
Cairns|Australia|-16.9186|145.7781|
Great Barrier Reef|Australia|-18.2871|147.6992|barrier reef
Uluru|Australia|-25.3444|131.0369|ayers rock
Tasmania|Australia|-42.0409|146.8087|
Hobart|Australia|-42.8821|147.3272|
Byron Bay|Australia|-28.6474|153.6020|
Whitsunday Islands|Australia|-20.2833|148.9333|whitsundays;whitehaven beach
Twelve Apostles|Australia|-38.6662|143.1050|great ocean road
Kakadu|Australia|-12.7000|132.6000|
Darwin|Australia|-12.4634|130.8456|
K'gari|Australia|-25.2398|153.1325|fraser island
Blue Mountains|Australia|-33.7000|150.3119|
Margaret River|Australia|-33.9550|115.0750|
Kangaroo Island|Australia|-35.8350|137.2500|
Canberra|Australia|-35.2809|149.1300|
Daintree|Australia|-16.1700|145.4185|
Broome|Australia|-17.9614|122.2359|
Rottnest Island|Australia|-32.0068|115.5175|rottnest;quokkas
Auckland|New Zealand|-36.8485|174.7633|
Queenstown|New Zealand|-45.0312|168.6626|
Milford Sound|New Zealand|-44.6414|167.8974|
Fiordland|New Zealand|-45.4167|167.7167|
Wellington|New Zealand|-41.2865|174.7762|
Rotorua|New Zealand|-38.1368|176.2497|
Hobbiton|New Zealand|-37.8721|175.6829|matamata;the shire
Christchurch|New Zealand|-43.5321|172.6362|
Lake Tekapo|New Zealand|-44.0047|170.4774|tekapo
Wanaka|New Zealand|-44.7032|169.1321|
Aoraki|New Zealand|-43.5950|170.1418|mount cook;mt cook
Franz Josef Glacier|New Zealand|-43.3880|170.1830|franz josef
Bay of Islands|New Zealand|-35.2800|174.0900|paihia
Tongariro|New Zealand|-39.1300|175.6500|tongariro crossing
Waiheke Island|New Zealand|-36.8000|175.1000|waiheke
Fiji|Fiji|-17.7134|178.0650|
Bora Bora|Fr. Polynesia|-16.5004|-151.7415|
Tahiti|Fr. Polynesia|-17.6509|-149.4260|
Moorea|Fr. Polynesia|-17.5388|-149.8295|
Rarotonga|Cook Is.|-21.2367|-159.7777|
Apia|Samoa|-13.8333|-171.7667|
Nuku'alofa|Tonga|-21.1790|-175.1982|
Port Vila|Vanuatu|-17.7333|168.3273|
Nouméa|New Caledonia|-22.2758|166.4580|noumea
Palau|Palau|7.5150|134.5825|
Port Moresby|Papua New Guinea|-9.4438|147.1803|
Honiara|Solomon Is.|-9.4456|159.9729|
Antarctic Peninsula|Antarctica|-64.2563|-60.9550|
South Pole|Antarctica|-90.0000|0.0000|
North Pole||90.0000|0.0000|
`;

// Natural Earth's short country names, shown in full, plus everyday names.
const COUNTRY_NAMES = {
  "United States of America": ["United States", "usa;us;america;united states;the states"],
  "United Kingdom": ["United Kingdom", "uk;britain;great britain"],
  "Dem. Rep. Congo": ["DR Congo", "drc;democratic republic of the congo"],
  "Central African Rep.": ["Central African Republic", ""],
  "Dominican Rep.": ["Dominican Republic", ""],
  "Bosnia and Herz.": ["Bosnia and Herzegovina", "bosnia"],
  "Eq. Guinea": ["Equatorial Guinea", ""],
  "S. Sudan": ["South Sudan", ""],
  "W. Sahara": ["Western Sahara", ""],
  "N. Cyprus": ["Northern Cyprus", ""],
  "Faeroe Is.": ["Faroe Islands", ""],
  "Falkland Is.": ["Falkland Islands", "falklands"],
  "Fr. Polynesia": ["French Polynesia", ""],
  "Fr. S. Antarctic Lands": ["French Southern Lands", ""],
  "Macedonia": ["North Macedonia", "macedonia"],
  "eSwatini": ["Eswatini", "swaziland"],
  "Antigua and Barb.": ["Antigua and Barbuda", ""],
  "St. Kitts and Nevis": ["Saint Kitts and Nevis", "st kitts"],
  "St. Vin. and Gren.": ["Saint Vincent and the Grenadines", "st vincent;grenadines"],
  "Solomon Is.": ["Solomon Islands", ""],
  "Marshall Is.": ["Marshall Islands", ""],
  "Cayman Is.": ["Cayman Islands", ""],
  "British Virgin Is.": ["British Virgin Islands", ""],
  "U.S. Virgin Is.": ["US Virgin Islands", ""],
  "Turks and Caicos Is.": ["Turks and Caicos Islands", ""],
  "Cook Is.": ["Cook Islands", ""],
  "N. Mariana Is.": ["Northern Mariana Islands", ""],
  "Pitcairn Is.": ["Pitcairn Islands", ""],
  "S. Geo. and the Is.": ["South Georgia", ""],
  "Wallis and Futuna Is.": ["Wallis and Futuna", ""],
  "St-Barthélemy": ["Saint Barthélemy", ""],
  "St-Martin": ["Saint Martin", ""],
  "St. Pierre and Miquelon": ["Saint Pierre and Miquelon", ""],
  "Br. Indian Ocean Ter.": ["British Indian Ocean Territory", "chagos"],
  "Czechia": ["Czechia", "czech republic"],
  "Myanmar": ["Myanmar", "burma"],
  "Côte d'Ivoire": ["Côte d'Ivoire", "ivory coast"],
  "Netherlands": ["Netherlands", "holland;the netherlands"],
  "South Korea": ["South Korea", "korea"],
  "Turkey": ["Turkey", "turkiye;türkiye"],
  "United Arab Emirates": ["United Arab Emirates", "uae;emirates"],
  "Cabo Verde": ["Cabo Verde", "cape verde"],
  "Timor-Leste": ["Timor-Leste", "east timor"],
  "Vatican": ["Vatican City", ""],
  "Philippines": ["Philippines", "the philippines"],
};
const SKIP_COUNTRIES = new Set(["Ashmore and Cartier Is.", "Indian Ocean Ter.", "Siachen Glacier", "Heard I. and McDonald Is."]);

/** "Reykjavík!" -> "reykjavik", for matching what people type. */
export function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^(the|a) /, "")
    .trim();
}

export function countryLabel(name) {
  return COUNTRY_NAMES[name]?.[0] ?? name;
}

let index;
function build() {
  const byName = new Map();
  const countries = new Map();
  const add = (key, entry) => {
    const k = normalize(key);
    if (!k) return;
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(entry);
  };
  const list = [];
  for (const line of PLACES.trim().split("\n")) {
    const [name, country, lat, lng, aliases = ""] = line.split("|");
    const entry = { name, country: country ? countryLabel(country) : "", sourceCountry: country, lat: Number(lat), lng: Number(lng) };
    list.push(entry);
    add(name, entry);
    // "Lagos, Nigeria" also answers to "Lagos" (after Lagos, Portugal).
    if (name.includes(",")) add(name.split(",")[0], entry);
    for (const alias of aliases.split(";")) add(alias, entry);
  }
  for (const [source, lat, lng] of COUNTRIES) {
    if (SKIP_COUNTRIES.has(source)) continue;
    const [label, aliases = ""] = COUNTRY_NAMES[source] ?? [source, ""];
    const entry = { name: label, country: label, sourceCountry: source, lat, lng, isCountry: true };
    list.push(entry);
    for (const key of [source, label, ...aliases.split(";")]) {
      const k = normalize(key);
      if (!k) continue;
      countries.set(k, entry);
      add(key, entry);
    }
  }
  index = { byName, countries, list };
  return index;
}

/** All entries, for tests and the checker. */
export function gazetteerEntries() {
  return (index ?? build()).list;
}

/**
 * The best offline match for what someone typed: "Kyoto", "Lisbon, Portugal",
 * "the Amalfi Coast". Returns { name, country, lat, lng } or null.
 */
export function lookupPlace(query) {
  const { byName, countries } = index ?? build();
  const raw = String(query ?? "").trim();
  if (!raw || raw.length > 120) return null;
  const pick = (candidates, hint) => {
    if (!candidates?.length) return null;
    if (hint) {
      const wanted = countries.get(hint)?.country;
      const match = wanted && candidates.find((c) => c.country === wanted);
      if (match) return match;
    }
    return candidates.find((c) => !c.isCountry) ?? candidates[0];
  };
  const whole = normalize(raw);
  const exact = byName.get(whole);
  if (exact) return pick(exact);
  // "Kyoto, Japan" or "Granada, Nicaragua": the place, steered by its country.
  const parts = raw.split(",").map(normalize).filter(Boolean);
  if (parts.length > 1) {
    const hint = parts[parts.length - 1];
    for (let take = parts.length - 1; take >= 1; take--) {
      const found = pick(byName.get(parts.slice(0, take).join(" ")), hint);
      if (found && (!countries.has(hint) || found.country === countries.get(hint).country)) return found;
    }
    if (countries.has(hint) && parts.length === 2) {
      // An unknown town in a known country: no guess, so it isn't pinned in the wrong place.
      return null;
    }
  }
  // "Yosemite National Park", "Santorini island", "Kyoto city".
  const trimmed = whole.replace(/\b(national park|island|islands|city|town|province|region|state)\b/g, "").replace(/\s+/g, " ").trim();
  if (trimmed && trimmed !== whole) return pick(byName.get(trimmed));
  return null;
}

/** Distance in km between two points, for sanity checks on coordinates. */
export function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
