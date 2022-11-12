#!/usr/bin/python3
from pathlib import Path
from string import Template


def indent(lines, levels, tabsize=4):
    return '\n'.join([(" " * levels * tabsize + ln) if ln.strip() else ln for ln in lines.splitlines()])


source = Path(".")
dest = Path("../html")


with \
        open(source / "template") as f_template, \
        open(source / "subnet_planner.css") as f_css, \
        open(source / "subnet_planner.js") as f_js, \
        open(source / "subnet_planner.html") as f_html, \
        open(dest / "subnet_planner.html", "w") as fout:
    template = Template(f_template.read())
    css = indent(f_css.read(), 2)
    js = indent(f_js.read(), 2)
    html = indent(f_html.read(), 1)

    result = template.substitute({
        "css": css,
        "js": js,
        "html": html,
    })

    fout.write(result)
