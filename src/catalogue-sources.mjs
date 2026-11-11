export const CATALOGUE_SOURCES = [
  {
    country:"United Kingdom", name:"Discover Uni / HESA dataset",
    url:"https://www.hesa.ac.uk/data-and-analysis/discover-uni-dataset",
    coverage:"Comparable information for full-time and part-time undergraduate courses; not a complete admissions, fee or visa feed.",
    access:"Public downloadable CSV/XML archive; refreshed weekly as required.",
    licence:"CC BY 4.0; attribution and change notice required.",
    status:"Available source; parser and automatic download are not configured in this package."
  },
  {
    country:"Ireland", name:"Irish Register of Qualifications (QQI)",
    url:"https://www.qqi.ie/what-we-do/the-qualifications-system/irish-register-of-qualifications",
    coverage:"Qualifications, programmes leading to them and quality-assured providers. Study-visa eligibility is a separate official check.",
    access:"Public register and data.gov.ie CKAN dataset/API; inspect each resource licence and coverage before reuse.",
    licence:"Confirm licence on the selected dataset resource.",
    status:"API credentials/feed mapping are not configured in this package."
  },
  {
    country:"Germany", name:"Hochschulkompass (German Rectors' Conference)",
    url:"https://www.hochschulkompass.de/en/study-in-germany.html",
    coverage:"Degree and doctoral programmes reported by state and state-recognised institutions; fees, intake and entry rules require institution evidence.",
    access:"Search portal; request an approved machine-readable feed or data agreement from HRK.",
    licence:"Confirm reuse terms and feed access with HRK.",
    status:"No public developer feed confirmed or configured."
  },
  {
    country:"Spain", name:"RUCT and QEDU",
    url:"https://www.ciencia.gob.es/en/Universidades/RUCT.html",
    coverage:"RUCT verifies universities, centres and official degrees; QEDU supports programme discovery using RUCT/SIIU data. Neither is a complete live fee/intake feed.",
    access:"Official registry/search application; request machine-readable access or use approved SIIU downloads.",
    licence:"Confirm reuse terms for each download or feed.",
    status:"No direct feed or parser configured."
  },
  {
    country:"Netherlands", name:"Study in NL / Studyfinder",
    url:"https://www.studyinnl.org/dutch-education/studies",
    coverage:"English-taught programme discovery; course pages and institutions remain the source for fees and admission details.",
    access:"Study in NL portal. Studiekeuze123 provides professional REST/OData access under its product terms; confirm scope and contract.",
    licence:"API access and licence must be arranged with the provider before use.",
    status:"No API credentials or licensed feed configured."
  },
  {
    country:"Hungary", name:"Study in Hungary / Tempus Public Foundation Study Finder",
    url:"https://tempus.tpf.hu/studyfinder/",
    coverage:"Study programmes at Hungarian institutions. The portal directs applicants to institutions for detailed requirements and application advice.",
    access:"Public search portal; request a permitted machine-readable feed from Tempus Public Foundation.",
    licence:"Confirm reuse and automated access terms with Tempus.",
    status:"No public developer feed confirmed or configured."
  }
];
