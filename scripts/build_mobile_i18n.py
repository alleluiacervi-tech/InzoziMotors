# scripts/build_mobile_i18n.py
import sys, os, json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "i18n_data"))

from dict_en import DICT_EN
from dict_rw import DICT_RW
from dict_fr import DICT_FR
from dict_sw import DICT_SW
from dict_ko import DICT_KO
from dict_zh import DICT_ZH

LANGUAGES = [
    {"code": "en", "label": "English", "nativeLabel": "English", "locale": "en-RW", "flag": "🇬🇧"},
    {"code": "rw", "label": "Kinyarwanda", "nativeLabel": "Kinyarwanda", "locale": "rw-RW", "flag": "🇷🇼"},
    {"code": "fr", "label": "French", "nativeLabel": "Français", "locale": "fr-RW", "flag": "🇫🇷"},
    {"code": "sw", "label": "Swahili", "nativeLabel": "Kiswahili", "locale": "sw-KE", "flag": "🇰🇪"},
    {"code": "ko", "label": "Korean", "nativeLabel": "한국어", "locale": "ko-KR", "flag": "🇰🇷"},
    {"code": "zh", "label": "Chinese", "nativeLabel": "中文", "locale": "zh-CN", "flag": "🇨🇳"},
]

TRANSLATIONS = {
    "en": DICT_EN,
    "rw": DICT_RW,
    "fr": DICT_FR,
    "sw": DICT_SW,
    "ko": DICT_KO,
    "zh": DICT_ZH,
}

def flatten(d, prefix=""):
    keys = []
    for k, v in d.items():
        curr = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys.extend(flatten(v, curr))
        else:
            keys.append(curr)
    return set(keys)

en_keys = flatten(DICT_EN)
print(f"Total English keys: {len(en_keys)}")

has_error = False
for code, d in TRANSLATIONS.items():
    if code == "en": continue
    k_set = flatten(d)
    diff = en_keys - k_set
    if diff:
        print(f"❌ Missing keys in {code}: {diff}")
        has_error = True
    else:
        print(f"✅ Language '{code}' has 100% key parity ({len(k_set)} keys)!")

if has_error:
    print("Aborting due to key parity errors.")
    sys.exit(1)

# Write clean JS output
file_content = f"""// Sawa Cars Mobile Internationalization & Localization Layer (i18n)
// Provides pure, natural, high-quality translations across all 6 supported languages:
// English (en), Kinyarwanda (rw), French (fr), Swahili (sw), Korean (ko), Chinese (zh).

export const LANGUAGES = {json.dumps(LANGUAGES, ensure_ascii=False, indent=2)};

export const DEFAULT_LANGUAGE = 'en';

export const TRANSLATIONS = {json.dumps(TRANSLATIONS, ensure_ascii=False, indent=2)};

export function normalizeLanguage(value) {{
  return LANGUAGES.some((item) => item.code === value) ? value : DEFAULT_LANGUAGE;
}}

export function languageFor(code) {{
  return LANGUAGES.find((item) => item.code === normalizeLanguage(code)) || LANGUAGES[0];
}}

export function translate(language, key, variables = {{}}) {{
  const code = normalizeLanguage(language);
  const lookup = (source) => String(key).split('.').reduce((value, part) => value?.[part], source);
  const value = lookup(TRANSLATIONS[code]) ?? lookup(TRANSLATIONS[DEFAULT_LANGUAGE]) ?? key;
  return String(value).replace(/\\{{\\{{(\\w+)\\}}\\}}/g, (_match, name) => (
    variables[name] == null ? `{{{{${{name}}}}}}` : String(variables[name])
  ));
}}

export function localeFor(code) {{
  return languageFor(code).locale;
}}
"""

out_path = os.path.join(os.path.dirname(__file__), "..", "src", "i18n", "index.js")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(file_content)

print(f"Successfully wrote {os.path.abspath(out_path)}!")
