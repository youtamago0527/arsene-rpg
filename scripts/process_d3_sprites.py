from pathlib import Path

from PIL import Image


SOURCE = Path(r"C:\Users\youta\.codex\generated_images\01a01183-e475-7f61-9e70-b91b954da9a2")
DESTINATION = Path(__file__).resolve().parents[1] / "assets" / "enemy-characters" / "dungeon3"
MAX_EDGE = 512

SPRITES = {
    "voidWatcher.png": "exec-b96437fb-df3c-405a-b29b-78fc07a8ed96.png",
    "abyssalKnight.png": "exec-c073f466-673f-426f-a3b5-e0dad98b26ca.png",
    "riftAssailant.png": "exec-978e29e8-a4e8-4332-ac4a-972922f484c3.png",
    "voidCantor.png": "exec-f0caeaf0-9c23-4f05-95c0-317d65e7196e.png",
    "ironChanter.png": "exec-3c2aead1-195f-4c7a-83dc-fb80f3e83ca4.png",
    "arcaneChanter.png": "exec-7bc20020-0b11-4d93-8253-745093c1f2da.png",
    "chaosWitch.png": "exec-ce9bc56a-badf-458b-a24a-c5069e0a9e45.png",
    "voidGargoyle.png": "exec-0c5d7d6d-ce3a-4319-874a-bf1bd3d643c1.png",
    "phantomEmperor.png": "exec-2936d475-9456-48b0-83ca-dd2f8f625641.png",
    "voidOrchestra.png": "exec-25691ad6-9e71-4731-b444-4b0be4d01ed5.png",
    "crimsonBehemoth.png": "exec-ccaeeb59-32a8-432f-8cac-2593307e39a5.png",
}

EXISTING_SPRITES = [
    "fortressGolem.png",
    "prismSentinel.png",
    "chainReaper.png",
    "voidAlchemist.png",
    "merox.png",
    "gildedHoarder.png",
]


def crop_visible(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    visible = alpha.point(lambda value: 255 if value > 6 else 0)
    box = visible.getbbox()
    if not box:
        return image
    left, top, right, bottom = box
    padding = max(8, round(max(right - left, bottom - top) * 0.025))
    return image.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(image.width, right + padding),
        min(image.height, bottom + padding),
    ))


def process(source_name: str, destination_name: str) -> None:
    image = Image.open(SOURCE / source_name).convert("RGBA")
    image = crop_visible(image)
    scale = min(1.0, MAX_EDGE / max(image.size))
    if scale < 1.0:
        image = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.Resampling.LANCZOS,
        )
    image.save(DESTINATION / destination_name, optimize=True, compress_level=9)
    print(f"{destination_name}: {image.width}x{image.height}")


def optimize_existing(filename: str) -> None:
    path = DESTINATION / filename
    image = crop_visible(Image.open(path).convert("RGBA"))
    scale = min(1.0, MAX_EDGE / max(image.size))
    if scale < 1.0:
        image = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.Resampling.LANCZOS,
        )
    image.save(path, optimize=True, compress_level=9)
    print(f"{filename}: {image.width}x{image.height}")


if __name__ == "__main__":
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for destination_name, source_name in SPRITES.items():
        process(source_name, destination_name)
    for filename in EXISTING_SPRITES:
        optimize_existing(filename)
