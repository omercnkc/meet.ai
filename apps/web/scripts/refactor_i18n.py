import os
import re

src_dir = r"c:\Users\omerc\Downloads\meet.ai\apps\web\src"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Replace imports
    content = re.sub(
        r'import\s*{\s*useI18n\s*(?:,\s*type\s+Locale\s*)?}\s*from\s*["\']@/shared/lib/i18n["\']',
        r'import { useTranslation } from "react-i18next"',
        content
    )
    
    # Replace hook calls
    content = re.sub(
        r'const\s*{\s*locale\s*,\s*setLocale\s*,\s*t\s*}\s*=\s*useI18n\(\)',
        r'const { t, i18n } = useTranslation()',
        content
    )
    content = re.sub(
        r'const\s*{\s*t\s*}\s*=\s*useI18n\(\)',
        r'const { t } = useTranslation()',
        content
    )

    # Replace locale usages
    content = re.sub(
        r'setLocale\(([^)]+)\)',
        r'i18n.changeLanguage(\1)',
        content
    )
    
    # In header.tsx and auth-layout.tsx they use `locale === 'en'`
    # we can replace `locale` with `i18n.language` if we capture those properly.
    # We will do a generic replacement if `i18n.language` is better.
    # Only for cases where locale was extracted.
    if "i18n.language" not in content and "const { t, i18n } = useTranslation()" in content:
        content = re.sub(r'\blocale\b(?!.*\s*=\s*|:\s*)', r'i18n.language', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            process_file(os.path.join(root, file))

print("Done refactoring imports and hooks.")
