#!/usr/bin/env python3
"""Scrape a public Notion site to local markdown and media files."""

import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE_URL = "https://spangled-catfish-37c.notion.site"
SPACE_ID = "b9fc0af9-39c5-4011-809c-01abb955ffe8"
ROOT_PAGE_ID = "0d02e15c-caed-45f2-aebf-3a8cd3b81466"
OUTPUT_DIR = Path(__file__).parent

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Notion-Client-Version": "23.13.0.11",
}


def api(endpoint, payload, retries=3):
    """POST to a Notion internal API endpoint."""
    url = f"{BASE_URL}/api/v3/{endpoint}"
    last_error = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=HEADERS)
            with urllib.request.urlopen(req, timeout=60) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code in (403, 429, 500, 502, 503) and attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise
    raise last_error


def unwrap(block_entry):
    """Normalize nested Notion block value wrappers."""
    value = block_entry.get("value", block_entry)
    if isinstance(value, dict) and "value" in value:
        value = value["value"]
    return value


def rich_text(parts):
    """Convert Notion rich text property arrays to plain markdown."""
    if not parts:
        return ""
    result = []
    for segment in parts:
        if not isinstance(segment, list) or not segment:
            continue
        text = str(segment[0]) if segment[0] is not None else ""
        annotations = segment[1] if len(segment) > 1 else []
        if not text:
            continue
        if isinstance(annotations, list):
            for ann in annotations:
                if not isinstance(ann, list) or not ann:
                    continue
                kind = ann[0]
                if kind == "b":
                    text = f"**{text}**"
                elif kind == "i":
                    text = f"*{text}*"
                elif kind == "c":
                    text = f"`{text}`"
                elif kind == "a" and len(ann) > 1:
                    href = ann[1]
                    text = f"[{text}]({href})"
        result.append(text)
    return "".join(result)


def slugify(name):
    """Create a filesystem-safe slug from a page title."""
    if not isinstance(name, str):
        name = str(name) if name else "untitled"
    name = re.sub(r"[^\w\s-]", "", name, flags=re.UNICODE)
    name = re.sub(r"[-\s]+", "-", name.strip().lower())
    return name[:80] or "untitled"


def download_file(url, dest):
    """Download a remote file if it does not already exist."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    req = urllib.request.Request(url, headers={"User-Agent": HEADERS["User-Agent"]})
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            data = response.read()
            content_type = response.headers.get("Content-Type", "")
            if dest.suffix == ".bin":
                ext_map = {
                    "video/mp4": ".mp4",
                    "video/webm": ".webm",
                    "image/png": ".png",
                    "image/jpeg": ".jpg",
                    "image/gif": ".gif",
                    "application/pdf": ".pdf",
                }
                ext = ext_map.get(content_type.split(";")[0], "")
                if ext:
                    dest = dest.with_suffix(ext)
            if not dest.exists() or dest.stat().st_size == 0:
                dest.write_bytes(data)
    except urllib.error.HTTPError as exc:
        print(f"  WARN: failed to download {url}: {exc}")
    return dest


class NotionScraper:
    def __init__(self):
        self.blocks = {}
        self.collections = {}
        self.collection_views = {}
        self.visited_pages = set()
        self.page_paths = {}
        self.current_out_dir = None
        self.media_dir = OUTPUT_DIR / "media"
        self.media_dir.mkdir(parents=True, exist_ok=True)

    def fetch_page_chunk(self, page_id):
        """Fetch all blocks for a page, handling pagination."""
        cursor_stack = []
        while True:
            data = api(
                "loadCachedPageChunkV2",
                {
                    "page": {"id": page_id, "spaceId": SPACE_ID},
                    "limit": 100,
                    "cursor": {"stack": cursor_stack},
                    "chunkNumber": 0,
                    "verticalColumns": False,
                },
            )
            for table, records in data.get("recordMap", {}).items():
                if table == "block":
                    self.blocks.update(records)
                elif table == "collection":
                    self.collections.update(records)
                elif table == "collection_view":
                    self.collection_views.update(records)
            cursors = data.get("cursors", [])
            if not cursors:
                break
            cursor_stack = cursors[0].get("stack", [])
            if not cursor_stack:
                break
            time.sleep(0.1)

    def sync_blocks(self, block_ids):
        """Fetch missing blocks by ID."""
        missing = [bid for bid in block_ids if bid not in self.blocks]
        if not missing:
            return
        for i in range(0, len(missing), 50):
            batch = missing[i : i + 50]
            try:
                data = api(
                    "syncRecordValues",
                    {
                        "requests": [
                            {"pointer": {"id": bid, "table": "block"}, "version": -1}
                            for bid in batch
                        ]
                    },
                )
                self.blocks.update(data.get("recordMap", {}).get("block", {}))
            except urllib.error.HTTPError:
                for bid in batch:
                    if bid not in self.blocks:
                        try:
                            self.fetch_page_chunk(bid)
                        except urllib.error.HTTPError:
                            pass
            time.sleep(0.15)

    def get_title(self, block):
        return rich_text(block.get("properties", {}).get("title", []))

    def query_collection(self, collection_id, view_id):
        """Fetch all rows from a Notion database/collection."""
        data = api(
            "queryCollection",
            {
                "source": {
                    "type": "collection",
                    "id": collection_id,
                    "spaceId": SPACE_ID,
                },
                "collectionView": {"id": view_id, "spaceId": SPACE_ID},
                "loader": {
                    "reducers": {
                        "collection_group_results": {"type": "results", "limit": 9999}
                    },
                    "searchQuery": "",
                    "userTimeZone": "America/New_York",
                },
            },
        )
        self.blocks.update(data.get("recordMap", {}).get("block", {}))
        self.collections.update(data.get("recordMap", {}).get("collection", {}))
        reducer = (
            data.get("result", {})
            .get("reducerResults", {})
            .get("collection_group_results", {})
        )
        return reducer.get("blockIds", [])

    def save_media(self, url, prefix="file"):
        """Download media and return a relative path."""
        if not url:
            return ""
        parsed = urllib.parse.urlparse(url)
        ext = Path(parsed.path).suffix or ".bin"
        filename = f"{prefix}-{abs(hash(url)) % 10**10}{ext}"
        dest = download_file(url, self.media_dir / filename)
        return f"media/{dest.name}"

    def block_to_markdown(self, block_id, depth=0):
        """Convert a single block and its children to markdown."""
        block = unwrap(self.blocks.get(block_id, {}))
        if not block or not block.get("alive", True):
            return ""

        block_type = block.get("type", "")
        lines = []
        indent = "  " * depth

        if block_type in ("text", "bulleted_list", "numbered_list", "to_do", "toggle"):
            text = rich_text(block.get("properties", {}).get("title", []))
            if text:
                prefix = "- " if block_type == "bulleted_list" else ""
                if block_type == "numbered_list":
                    prefix = "1. "
                if block_type == "to_do":
                    checked = block.get("properties", {}).get("checked", [["No"]])[0][0] == "Yes"
                    prefix = "- [x] " if checked else "- [ ] "
                lines.append(f"{indent}{prefix}{text}")
        elif block_type == "header":
            lines.append(f"{indent}# {rich_text(block.get('properties', {}).get('title', []))}")
        elif block_type == "sub_header":
            lines.append(f"{indent}## {rich_text(block.get('properties', {}).get('title', []))}")
        elif block_type == "sub_sub_header":
            lines.append(f"{indent}### {rich_text(block.get('properties', {}).get('title', []))}")
        elif block_type == "quote":
            text = rich_text(block.get("properties", {}).get("title", []))
            if text:
                lines.append(f"{indent}> {text}")
        elif block_type == "callout":
            text = rich_text(block.get("properties", {}).get("title", []))
            icon = block.get("format", {}).get("page_icon", "💡")
            if text:
                lines.append(f"{indent}> {icon} {text}")
        elif block_type == "divider":
            lines.append(f"{indent}---")
        elif block_type == "code":
            text = rich_text(block.get("properties", {}).get("title", []))
            lang = block.get("properties", {}).get("language", [["plain text"]])[0][0]
            lines.append(f"{indent}```{lang}\n{text}\n```")
        elif block_type == "equation":
            text = rich_text(block.get("properties", {}).get("title", []))
            lines.append(f"{indent}$${text}$$")
        elif block_type in ("image", "file", "pdf", "audio"):
            source = block.get("properties", {}).get("source", [[""]])[0][0]
            caption = rich_text(block.get("properties", {}).get("caption", []))
            if source:
                rel = self.save_media(source, block_type)
                alt = caption or block_type
                lines.append(f"{indent}![{alt}]({rel})")
                if caption:
                    lines.append(f"{indent}*{caption}*")
        elif block_type == "video":
            source = block.get("properties", {}).get("source", [[""]])[0][0]
            if source:
                rel = self.save_media(source, "video")
                lines.append(f"{indent}[Video]({rel})")
            elif block.get("format", {}).get("display_source"):
                lines.append(f"{indent}[Video]({block['format']['display_source']})")
        elif block_type == "bookmark":
            url = block.get("properties", {}).get("link", [[""]])[0][0]
            title = rich_text(block.get("properties", {}).get("title", [])) or url
            lines.append(f"{indent}[{title}]({url})")
        elif block_type == "embed":
            src = block.get("format", {}).get("display_source", "")
            if src:
                lines.append(f"{indent}[Embed]({src})")
        elif block_type == "page":
            title = self.get_title(block)
            child_path = self.page_paths.get(block_id)
            if child_path:
                lines.append(f"{indent}- [{title}]({child_path})")
            else:
                lines.append(f"{indent}- {title}")
        elif block_type == "alias":
            alias_id = block.get("format", {}).get("alias_pointer", {}).get("id")
            if alias_id:
                alias_block = unwrap(self.blocks.get(alias_id, {}))
                title = self.get_title(alias_block) or alias_id
                child_path = self.page_paths.get(alias_id, title)
                lines.append(f"{indent}- [{title}]({child_path}) (alias)")
        elif block_type == "collection_view":
            collection_id = block.get("collection_id")
            view_ids = block.get("view_ids", [])
            if not collection_id:
                pointer = block.get("format", {}).get("collection_pointer", {})
                collection_id = pointer.get("id")
            if not collection_id and view_ids:
                cv = unwrap(self.collection_views.get(view_ids[0], {}))
                collection_id = cv.get("format", {}).get("collection_pointer", {}).get("id")
            if collection_id and view_ids:
                lines.extend(
                    self.collection_to_markdown(
                        collection_id, view_ids[0], depth, out_dir=self.current_out_dir
                    )
                )
        elif block_type == "table":
            pass  # handled via children
        elif block_type == "column_list":
            pass  # handled via children
        else:
            text = rich_text(block.get("properties", {}).get("title", []))
            if text:
                lines.append(f"{indent}{text}")

        for child_id in block.get("content", []):
            self.sync_blocks([child_id])
            child_md = self.block_to_markdown(child_id, depth + (1 if block_type == "toggle" else 0))
            if child_md:
                lines.append(child_md)

        return "\n".join(lines)

    def prop_value(self, row, prop_id, schema):
        """Extract a cell value from a collection row."""
        if prop_id == "title":
            return self.get_title(row)
        val = row.get("properties", {}).get(prop_id, [])
        if not val:
            return ""
        prop_type = schema.get(prop_id, {}).get("type", "")
        if prop_type == "multi_select":
            return ", ".join(item[0] for item in val if item)
        if prop_type == "select":
            return val[0][0] if val and val[0] else ""
        if prop_type == "checkbox":
            return "Yes" if val[0][0] == "Yes" else "No"
        if prop_type == "number":
            return val[0][0] if val and val[0] else ""
        return rich_text(val)

    def collection_to_markdown(self, collection_id, view_id, depth=0, out_dir=None):
        """Render a database/collection as markdown table and JSON."""
        indent = "  " * depth
        lines = []
        try:
            row_ids = self.query_collection(collection_id, view_id)
        except urllib.error.HTTPError as exc:
            lines.append(f"{indent}*(collection unavailable: {exc})*")
            return lines

        if not row_ids:
            return lines

        collection = unwrap(self.collections.get(collection_id, {}))
        schema = collection.get("schema", {})
        prop_names = ["title"] + [k for k in schema if k != "title"]

        headers = []
        for prop_id in prop_names:
            if prop_id == "title":
                headers.append("Name")
            else:
                headers.append(schema[prop_id].get("name", prop_id))

        rows_data = []
        for row_id in row_ids:
            row = unwrap(self.blocks.get(row_id, {}))
            if not row:
                continue
            row_obj = {"id": row_id}
            cells = []
            for prop_id in prop_names:
                cell = self.prop_value(row, prop_id, schema)
                key = headers[len(cells)]
                row_obj[key] = cell
                cells.append(cell.replace("|", "\\|"))
            rows_data.append(row_obj)
            lines.append(f"{indent}| {' | '.join(cells)} |")

        lines.insert(0, f"{indent}| {' | '.join(['---'] * len(headers))} |")
        lines.insert(0, f"{indent}| {' | '.join(headers)} |")

        if out_dir:
            coll_name = collection.get("name")
            if isinstance(coll_name, list):
                coll_name = rich_text(coll_name)
            coll_dir = Path(out_dir) / "collections" / slugify(coll_name or collection_id)
            coll_dir.mkdir(parents=True, exist_ok=True)
            (coll_dir / "rows.json").write_text(
                json.dumps(rows_data, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            (coll_dir / "table.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
            print(f"Saved: {coll_dir.relative_to(OUTPUT_DIR)}/rows.json ({len(rows_data)} rows)")

        return lines

    def scrape_page(self, page_id, out_dir):
        """Recursively scrape a page and its child pages."""
        if page_id in self.visited_pages:
            return
        self.visited_pages.add(page_id)

        self.fetch_page_chunk(page_id)
        block = unwrap(self.blocks.get(page_id, {}))
        if not block:
            return

        title = self.get_title(block) or page_id
        out_dir = Path(out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        prev_out_dir = self.current_out_dir
        self.current_out_dir = out_dir

        rel_path = out_dir.relative_to(OUTPUT_DIR) / "index.md"
        self.page_paths[page_id] = str(rel_path)

        # Download cover/icon
        fmt = block.get("format", {})
        if fmt.get("page_cover"):
            cover_rel = self.save_media(fmt["page_cover"], "cover")
            cover_line = f"![cover]({cover_rel})\n\n"
        else:
            cover_line = ""

        icon = fmt.get("page_icon", "")
        icon_line = f"{icon} " if icon and not icon.startswith("http") else ""

        md_lines = [f"# {icon_line}{title}", ""]
        if cover_line:
            md_lines.insert(1, cover_line)

        for child_id in block.get("content", []):
            child = unwrap(self.blocks.get(child_id, {}))
            if child.get("type") == "page":
                child_title = self.get_title(child) or child_id
                child_slug = slugify(child_title)
                child_dir = out_dir / child_slug
                self.scrape_page(child_id, child_dir)
                child_rel = (child_dir / "index.md").relative_to(OUTPUT_DIR)
                md_lines.append(f"- [{child_title}]({child_rel})")
                md_lines.append("")
            else:
                self.sync_blocks([child_id])
                child_md = self.block_to_markdown(child_id)
                if child_md:
                    md_lines.append(child_md)
                    md_lines.append("")

        index_path = out_dir / "index.md"
        index_path.write_text("\n".join(md_lines).strip() + "\n", encoding="utf-8")
        print(f"Saved: {index_path.relative_to(OUTPUT_DIR)}")
        self.current_out_dir = prev_out_dir

    def run(self):
        """Scrape the full site starting from the root page."""
        print(f"Scraping Notion site to {OUTPUT_DIR}")
        self.scrape_page(ROOT_PAGE_ID, OUTPUT_DIR)

        metadata = {
            "source_url": f"{BASE_URL}/Self-Authoring-By-Jordan-Peterson-{ROOT_PAGE_ID.replace('-', '')}",
            "root_page_id": ROOT_PAGE_ID,
            "space_id": SPACE_ID,
            "pages_scraped": len(self.visited_pages),
            "blocks_fetched": len(self.blocks),
            "collections_fetched": len(self.collections),
            "page_paths": self.page_paths,
        }
        (OUTPUT_DIR / "metadata.json").write_text(
            json.dumps(metadata, indent=2), encoding="utf-8"
        )

        raw_blocks = {}
        for bid, entry in self.blocks.items():
            raw_blocks[bid] = unwrap(entry)
        (OUTPUT_DIR / "raw-blocks.json").write_text(
            json.dumps(raw_blocks, indent=2, ensure_ascii=False, default=str),
            encoding="utf-8",
        )
        print(f"\nDone: {len(self.visited_pages)} pages, {len(self.blocks)} blocks")


if __name__ == "__main__":
    NotionScraper().run()
