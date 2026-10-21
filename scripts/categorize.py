"""Assign a catalog category from the dish title, falling back to the recipe's ingredients.

Whole-word matching: the old substring rules filed "steak" under Drinks (tea) and "rice" under Desserts (ice).
"""
import re



def words(*terms: str) -> re.Pattern:
    return re.compile(r"\b(?:" + "|".join(terms) + r")\b", re.I)


DRINK_TAIL = re.compile(r"\b(juice|shake|smoothie|iced tea|milk tea|tea|drink|cooler|lemonade|soda|coffee|frappe|latte|in ice)\s*$", re.I)
DRINK_NAMES = words("salabat", "sikwate", "tsokolate", "kapeng barako", "kape", "samalamig", "sago at gulaman", "sago't gulaman", "sago.t gulaman",
                    "bignay wine", "basi", "tuba", "lambanog", "bahalina", "tapuy", "tsaa", "batirol")
DESSERT = words("cake", "cupcakes?", "cheesecake", "pudding", "ice cream", "ice candy", "ice drops", "halo.?halo", "leche flan", "flan", r"puto\w*", "kakanin",
                "turon", "cookies?", r"bibingka\w*", "bibingkoy", "suman", "biko", "taho", "kutsinta", "sapin.?sapin", "maja blanca", "polvoron", "pastillas",
                "yema", "ensaymada", "ensaimada", "pandesal", r"pan de \w+", "hopia", "mamon", "pianono", "brazo de mercedes", "sans rival", "silvanas", "espasol",
                "palitaw", "pichi.?pichi", "buchi", "carioca", "maruya", "banana cue", "banana.?q", "kamote cue", "kamote.?q", "binatog", "binignit", "bilo.?bilo",
                "buko pandan", "buko salad", "fruit salad", "crema de fruta", "piaya", "tupig", "kalamay", "tikoy", "pie", "macaroons?", "brownies", "mais con yelo",
                "saba con yelo", "champorado", "jelly", "pastry", "bread", "monay", "halaya", "ube", "minatamis", "matamis", "candy", "candied", "chocolate",
                "graham", "float", "tarts?", "donuts?", "doughnuts?", "bars", "sorbetes", "ginanggang", "nilupak", "otap", "barquillos", "rosquillos", "broas",
                "uraro", "meringue", "custard", "mousse", "parfait", "ice scramble", "scramble", "gulaman", "sago", "nata", "buko", "merengue", "macapuno", "moche",
                "mochi", "inipit", "napoleones", "lengua de gato", "pancakes?", "waffles?", "toast", "leche", "panna cotta", "tiramisu", "crinkles", "cassava cake",
                "kababayan", "spanish bread", "putok", "biscocho", "bitso.?bitso", "shakoy", "binangkal", "ginataang mais", "ginataang bilo", "ginataang halo",
                "minatamis na saging", "nilagang saging", "pinipig", "guinumis", "inutak", "masi", "binallay", "bukayo", "coco jam", "latik", "mango royale",
                "mango bango", "deremen", "inday inday", "tambo tambo", "pinakro", "masikoy", "inangit", "biyaki", "banana chips", "ginataang kamoteng kahoy",
                "pulot", "food for the gods", "camote delight", "sampalok candy", "pastimallows", "marshmallows?", "royale", "turrones?", "yema cake", "pastel de",
                "ambrosia", "champorado")
SAVORY = re.compile(r"\b(fish|crab|shrimp|tuna|salmon|corn|potato|tofu)\s*cakes?\b|\b(sinigang|adobo|adobong|sopas|ginisang|nilaga|tinola|sisig|lumpiang? (?!saging)|paksiw|kinilaw|kaldereta|afritada|menudo|mechado|guisado|inihaw|pizza|nachos|siopao|empanada)\b", re.I)
RICE_NOODLE = words("rice", "sinangag", "pancit", "pansit", "bihon", "noodles?", "lomi", "mami", "batchoy", "miki", "palabok", "luglug", "spaghetti", "pasta",
                    "macaroni", "lasagna", "carbonara", "penne", "fettuccine", "linguine", "ramen", "udon", "sotanghon", "canton", "misua", "miswa", "odong",
                    "bam.?i", "kinalas", "lugaw", "lomisua", "bulalugaw", "bihongke", "spabok", "goto", "arroz caldo", "arroz", "bringhe", "paella", "biryani",
                    "kiampong", "kiam pung", "morisqueta", "java", r"\w*silog", "congee", "risotto", "pater", "pastil", r"puso\s*$", "hanging rice", "fried rice")
MEAT_ONLY = words("pork", "baboy", "liempo", "lechon", "litson", "kasim", "pata", "bagnet", "beef", "baka", "bacon", "ham", "hamon", "jamon", "sausage", "chorizo",
                  "hotdog", "spam", "corned beef", "goat", "kambing", "kalding", "kanding", "lamb", "oxtail", "tripe", "ribs?", "bulalo", "longganisa", "longanisa",
                  "longaniza", "speck", "bratwurst", "carne", "lomo", "brisket", "tenderloin")
PORK_BEEF = words("pork", "baboy", "liempo", "lechon", "litson", "kasim", "pata", "bagnet", "chicharon", "chicharron", "longganisa", "longanisa", "longaniza",
                  "tocino", "bulalo", "beef", "baka", "ribs?", "pares", "dinuguan", "bopis", "igado", "papaitan", "pinapaitan", "embutido", "embotido",
                  "morcon", "hamonado", "ham", "bacon", "sausage", "chorizo", "hotdog", "spam", "corned beef", "giniling", "picadillo", "callos", "tripe",
                  "goat", "kambing", "kalding", "kanding", "bagis", "dinakdakan", "paklay", "balbacua", "cansi", "sinanglaw", "pigar.?pigar", "burger",
                  "lumpiang? shanghai", "shanghai", "tokwa.?t baboy", "tokwat baboy", "kawali", "pinakupsan", "tulapho", "pindang", "lauya", "lomo", "tenderloin",
                  "brisket", "oxtail", "lamb", "carne", "jamon", "hamon", "patatim", "pata tim", "maskara", "mascara", "beefsteak", "tocilog", "tapsilog",
                  "longsilog", "porksilog", "cornsilog", "spamsilog", "hotsilog", "crispy ulo", "pork chops?", "isaw", "tenga", "speck", "bratwurst", "tapa",
                  "lengua(?! de gato)")
GENERIC_MEAT = words("sisig", "bistek", "kaldereta", "caldereta", "mechado", "menudo", "afritada", "humba", "pochero", "puchero", "nilaga", "kare.?kare", "steak",
                     "meatballs?", "bola.?bola", "siomai", "shumai", "salpicao", "liver", "atay", "estofado", "asado", "lumpia", "kilawin", "binagoongan",
                     "bicol express", "dinamita", "dynamite", "barbecue", "bbq", "adobo", "adobong", "sinigang", "giniling")
CHICKEN = words("chicken", "manok", "inasal", "pinikpikan", "pospas", "wings", "gallina", "pollo", "chicksilog", "adobong atay", "balunbalunan", "gizzard",
                "drumsticks?", "pinaupong", "cordon bleu", "adidas", "helmet", "proben", "itik", "duck(?! eggs?)", "pato", "patotin", "turkey", "pabo")
SEAFOOD = words("fish", "isda", "bangus", "milkfish", "tilapia", "hipon", "shrimps?", "prawns?", "tuna", "salmon", "pusit", "squid", "tahong", "mussels?",
                "crabs?", "alimango", "alimasag", "sardinas", "sardines?", "galunggong", "tanigue", "tangigue", "lapu.?lapu", "dalag", "hito", "catfish",
                "tulingan", "dilis", "anchov(?:y|ies)", "tinapa", "tuyo", "daing", "danggit", "halaan", "clams?", "oysters?", "talaba", "kinilaw", "sinuglaw",
                "escabeche", "bakalaw", "bacalao", "dory", "mackerel", "sapsap", "maya.?maya", "pompano", "seafood", "scallops?", "lobster", "curacha", "aligue",
                "octopus", "pugita", "kani", "fishballs?", "fish balls?", "kikiam", "kwek.?kwek", "tokneneng", "crawfish", "crayfish", "mahi.?mahi", "snapper",
                "larang", "ukoy", "okoy", "hasa.?hasa", "bisugo", "tambakol", "espada", "tulya", "sugpo", "halabos", "sinaing", "inun.?unan", "pesa", "pesang",
                "kinunot", "pagi", "stingray", "eel", "palos", "dulong", "crablets", "shellfish", "bangsilog", "dilisilog", "tuyosilog", "dangsilog", "calamares",
                "kuhol", "snails?", "imbaw", "tahong", "sinugba", "tortang alimasag", "relyenong bangus")
VEGETABLE = words("gulay", "talong", "eggplant", "ampalaya", "bitter melon", "sitaw", "string beans", "kalabasa", "squash", "monggo", "munggo", "mongo",
                  "mung beans?", "balatong", "balatung", "kangkong", "water spinach", "tofu", "tokwa", "tahu", "okra", "pinakbet", "laing", "upo", "sayote",
                  "chayote", "pechay", "bok choy", "repolyo", "cabbage", "patola", "mustasa", "labanos", "radish", "togue", "bean sprouts?", "ubod", "puso ng saging",
                  "banana blossom", "langka", "jackfruit", "dinengdeng", "bulanglang", "bulanghang", "laswa", "utan", "law.?uy", "ensalada", "ensaladang", "salad",
                  "atchara", "achara", "chopsuey", "chop suey", "chopseuy", "gabi", "taro", "malunggay", "moringa", "alugbati", "mushrooms?", "papaya",
                  "vegetables?", "vegetarian", "vegan", "lumpiang? gulay", "lumpiang? togue", "lumpiang? sariwa", "lumpiang? ubod", "ginataang gulay", "pako",
                  "fern", "talbos", "kamatis", "tomato", "carrots?", "potato", "patatas", "gising.?gising", "pipino", "cucumber", "sigarilyas", "bataw", "kadios",
                  "garbanzos", "chickpeas?", "beans", "abitsuelas", "abistsuelas", "corn", "mais", "ginisang", "guisado", "guisadong", "gisadong", "gisang",
                  "poqui.?poqui", "pinangat na gabi", "kilawing puso", "lettuce", "spinach", "broccoli", "cauliflower", "sitao", "camote", "tops", "labong",
                  "itlog", "eggs?", "omelet", "omelette", "tortang")
CONDIMENTS = re.compile(r"\b(lechon sauce|lechon manok sauce|fishball sauce|sukang sawsawan|dipping sauce|liver spread|annatto oil|atsuete|sinamak|palapa|kesong puti|etag|magic water)\b", re.I)
KEEP_ULAM = re.compile(r"\b(balut|pickled|tamilok|salagubang|kamaru|kamaro|uok|abuos|sawsawan|adobong mani|bagoong guisado|ginisang bagoong|kiniing)\b", re.I)

PROTEIN_IN_INGREDIENTS = [
    ("Pork & beef", words("pork", "baboy", "beef", "baka", "liempo", "bacon", "ham", "longganisa", "longanisa", "chorizo", "sausage", "hotdog", "spam",
                          "corned beef", "giniling", "lechon", "chicharon", "tocino", "tapa", "oxtail", "tripe", "goat", "kambing", "lamb", "ground meat", "meat",
                          "pata", "kasim", "ribs?")),
    ("Chicken", words("chicken", "manok", "gizzard", "wings", "drumsticks?")),
    ("Seafood", words("fish", "shrimps?", "prawns?", "bangus", "tilapia", "tuna", "salmon", "squid", "pusit", "crabs?", "mussels?", "clams?", "sardines?",
                      "galunggong", "tinapa", "tuyo", "daing", "danggit", "anchov(?:y|ies)", "dilis", "oysters?", "scallops?", "seafood", "mackerel", "dory",
                      "aligue", "kani", "crabmeat", "hipon")),
]
SEASONING = re.compile(r"\b(fish sauce|patis|bagoong|shrimp paste|oyster sauce|(chicken|pork|beef|shrimp|fish) (stock|broth|cubes?|bouillon|powder|seasoning)|(knorr|maggi) [\w ]*cubes?)\b", re.I)
VEG_ONLY_HINT = words("tofu", "tokwa", "eggs?", "itlog", "vegetables?", "kangkong", "ampalaya", "sitaw", "kalabasa", "monggo", "mung beans?", "talong",
                      "eggplant", "okra", "sayote", "pechay", "cabbage", "repolyo", "upo", "patola", "mushrooms?", "squash", "string beans")


def title_category(title: str) -> str | None:
    t = re.sub(r"[()\-–|/:,'’]", " ", title)
    t = re.sub(r"\blechon manok\b", "chicken", t, flags=re.I)
    if DRINK_TAIL.search(t) or DRINK_NAMES.search(t):
        return "Drinks"
    if DESSERT.search(t) and not SAVORY.search(t) and not PORK_BEEF.search(t) and not CHICKEN.search(t) and not SEAFOOD.search(t) \
            and not RICE_NOODLE.search(re.sub(r"\brice (balls?|cakes?)\b", "", t, flags=re.I)):
        return "Desserts"
    # Condiments, exotic items and the like stay in the catch-all rather than being forced into a protein.
    condiment = CONDIMENTS.search(t)
    if condiment and (len(t.strip()) <= 32 or t.lower().startswith(condiment.group().lower())):
        return "More ulam"
    if KEEP_ULAM.search(t) and not (PORK_BEEF.search(t) or CHICKEN.search(t) or SEAFOOD.search(t) or RICE_NOODLE.search(t) or VEGETABLE.search(t)):
        return "More ulam"
    if RICE_NOODLE.search(t):
        return "Rice & noodles"
    if CHICKEN.search(t) and not MEAT_ONLY.search(t):
        return "Chicken"
    if PORK_BEEF.search(t):
        return "Pork & beef"
    if CHICKEN.search(t):
        return "Chicken"
    if SEAFOOD.search(t):
        return "Seafood"
    # "Adobong sitaw" is a vegetable dish even when the recipe adds a little pork.
    if VEGETABLE.search(t):
        return "Vegetables"
    if GENERIC_MEAT.search(t):
        return "GENERIC"
    if re.search(r"\btinola\b", t, re.I):
        return "Chicken"
    if DESSERT.search(t) and not SAVORY.search(t):
        return "Desserts"
    return None


def ingredient_category(ingredients: list[str]) -> str | None:
    text = "\n".join(SEASONING.sub("", line) for line in ingredients)
    for label, pattern in PROTEIN_IN_INGREDIENTS:
        if pattern.search(text):
            return label
    if VEG_ONLY_HINT.search(text):
        return "Vegetables"
    return None


def category_for(title: str, ingredients: list[str] | None) -> str:
    guess = title_category(title)
    if guess == "GENERIC":
        # A dish name like afritada or sisig: the recipe decides the protein, pork/beef when unknown.
        return (ingredient_category(ingredients) if ingredients else None) or "Pork & beef"
    return guess or (ingredient_category(ingredients) if ingredients else None) or "More ulam"
