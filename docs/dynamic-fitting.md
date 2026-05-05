# Dynamic Label Fitting

`dynamic` row sizing lives in `printpage/rendering.py` because both `/labels.pdf` and `/print` use the same rendered HTML. Keeping the fitting step server-side makes the preview PDF and printed PDF agree.

## Render Flow

1. Request data is validated into a `LabelProfileInput`.
2. `printpage/rendering.py` resolves label dimensions from the selected stock layout.
3. `label_rows()` assigns a font size to every `dynamic` row.
4. `templates/labels/label.html` renders simple CSS with that explicit `font-size`.
5. WeasyPrint renders the same HTML to PDF for preview and print submission.

## Dynamic Measurement

Dynamic sizing uses WeasyPrint as the single source of truth. `measure_weasyprint_text()` renders a small measurement document with the same label font family, `font-weight`, `font-style`, `font-size`, `white-space: nowrap`, and `line-height` as the real label template.

The helper reads the resulting WeasyPrint layout boxes and returns:

- the rendered text box width in CSS pixels
- the rendered line box height in CSS pixels
- the resolved font style
- the resolved font weight

`dynamic_font_size_pt()` then binary-searches the largest integer point size whose measured text width fits the available row width and whose line height fits the row height.

Metric results are cached by the helper arguments, so repeated rows with the same text and styling do not trigger repeated WeasyPrint renders.

## Units

The fitting comparison uses WeasyPrint CSS pixels:

- `1mm = 96 / 25.4 CSS px`
- `1pt = 1 / 72 inch`

The template still writes the selected size as `pt` because that is the unit the operator sees and the unit WeasyPrint applies in the final PDF. Width and height checks are converted into CSS pixels to match WeasyPrint's layout tree.

## Fonts And Italic Text

The label template uses this font stack:

```css
"DejaVu Sans", "Liberation Sans", "Noto Sans", Arial, sans-serif
```

Italic rows use real CSS:

```css
font-style: italic;
```

There is no synthetic skew transform in the template. The Docker image installs `fonts-dejavu-extra` so Pango has real DejaVu bold, italic, and bold-oblique faces available inside the container.

## Dependencies

Pillow is not a direct application dependency and is not used for fitting. WeasyPrint may still install Pillow as one of its own transitive dependencies; that is separate from the app's measurement path.

Local macOS development needs WeasyPrint's native libraries available before tests that render real PDFs can run:

```sh
brew install pygobject3
```

Unit tests that exercise endpoint behavior monkeypatch the WeasyPrint metric helper so routine local test runs do not depend on native library availability.

## Verification

Run the normal repository gate after rendering changes:

```sh
mise check
```

The Docker image is the closest local check for the deployed Linux render stack:

```sh
docker build -t printpage:local .
```

This script checks the regression payload that previously failed to fit and failed to render as italic:

```sh
docker run --rm -i printpage:local python - <<'PY'
from weasyprint import HTML

from printpage.models import LabelBorderInput, LabelProfileInput, LabelRowInput
from printpage.rendering import render_label_html
from printpage.stock import resolve_preview_layout

profile = LabelProfileInput(
    name="Regression",
    rows=[
        LabelRowInput(
            text="New label",
            level="dynamic",
            alignment="center",
            bold=True,
            italic=True,
        )
    ],
    border=LabelBorderInput(enabled=False),
    width_mm=61.98,
    height_mm=22,
)
layout = resolve_preview_layout(profile)
html = render_label_html(profile, layout)
document = HTML(string=html).render()
page_box = document.pages[0]._page_box

matches = []

def collect(box):
    if type(box).__name__ == "TextBox" and getattr(box, "text", "") == "New label":
        matches.append(box)
    for child in getattr(box, "children", []):
        collect(child)

collect(page_box)
text_box = matches[0]
style = text_box.style
page_width = page_box.width
right_edge = text_box.position_x + text_box.width

print("font-size:", "font-size: 30pt;" in html)
print("fits:", right_edge <= page_width)
print("style:", style["font_style"])
print("weight:", style["font_weight"])
print("text-width:", round(text_box.width, 2))
print("page-width:", round(page_width, 2))
PY
```

Expected result:

- `fits: True`
- `style: italic`
- `weight: 700`
