from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

FLAGS = {
    "Alemania": "de",
    "Arabia Saudita": "sa",
    "Argelia": "dz",
    "Argentina": "ar",
    "Australia": "au",
    "Austria": "at",
    "Bélgica": "be",
    "Bosnia y Herzegovina": "ba",
    "Brasil": "br",
    "Cabo Verde": "cv",
    "Canadá": "ca",
    "Catar": "qa",
    "Chequia": "cz",
    "Colombia": "co",
    "Corea del Sur": "kr",
    "Costa de Marfil": "ci",
    "Croacia": "hr",
    "Curazao": "cw",
    "Ecuador": "ec",
    "Egipto": "eg",
    "Escocia": "gb-sct",
    "España": "es",
    "Estados Unidos": "us",
    "Francia": "fr",
    "Ghana": "gh",
    "Haití": "ht",
    "Inglaterra": "gb-eng",
    "Irak": "iq",
    "Irán": "ir",
    "Japón": "jp",
    "Jordania": "jo",
    "Marruecos": "ma",
    "México": "mx",
    "Noruega": "no",
    "Nueva Zelanda": "nz",
    "Países Bajos": "nl",
    "Panamá": "pa",
    "Paraguay": "py",
    "Portugal": "pt",
    "República Democrática del Congo": "cd",
    "Senegal": "sn",
    "Sudáfrica": "za",
    "Suecia": "se",
    "Suiza": "ch",
    "Túnez": "tn",
    "Turquía": "tr",
    "Uruguay": "uy",
    "Uzbekistán": "uz",
}

OUTPUT_DIR = Path("public/flags")
BASE_URL = "https://flagcdn.com"


def download_file(url: str, output_path: Path) -> None:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})

    with urlopen(request, timeout=20) as response:
        output_path.write_bytes(response.read())


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    failed = []

    for country, code in FLAGS.items():
        output_path = OUTPUT_DIR / f"{code}.svg"
        url = f"{BASE_URL}/{code}.svg"

        try:
            download_file(url, output_path)
            print(f"Downloaded {country}: {output_path}")
        except (HTTPError, URLError, TimeoutError) as error:
            failed.append((country, code, str(error)))
            print(f"Failed {country} ({code}): {error}")

    if failed:
        print("\nFailed downloads:")
        for country, code, error in failed:
            print(f"- {country} ({code}): {error}")
        raise SystemExit(1)

    print(f"\nDone. Flags saved to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()