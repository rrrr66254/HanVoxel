/**
 * HanVoxel — HS 코드 마스터 시드 데이터
 * 한국 주요 수출입 품목 기준 8개 챕터, 6자리 heading 레벨
 *
 * 챕터: 87(자동차), 85(전기기기), 84(기계류), 90(광학기기),
 *       39(플라스틱), 72(철강), 29(유기화학), 27(광물성 연료)
 */

export interface HsCodeMasterSeed {
  hsCode: string;
  description: string;
  descriptionEn: string;
  chapter: string;
  heading: string;
}

export const HS_CODE_MASTER_SEEDS: HsCodeMasterSeed[] = [
  // ============================================================
  // 챕터 87 — 자동차·트랙터·자전거 및 기타 차량
  // ============================================================
  { hsCode: '870110', description: '보행용 트랙터', descriptionEn: 'Pedestrian-controlled tractors', chapter: '87', heading: '8701' },
  { hsCode: '870120', description: '반궤도식 트랙터', descriptionEn: 'Road tractors for semi-trailers', chapter: '87', heading: '8701' },
  { hsCode: '870210', description: '디젤 버스 (10인 이상)', descriptionEn: 'Motor vehicles for transport of 10+ persons, diesel', chapter: '87', heading: '8702' },
  { hsCode: '870321', description: '가솔린 승용차 (1,000cc 이하)', descriptionEn: 'Passenger vehicles, spark-ignition, ≤1000cc', chapter: '87', heading: '8703' },
  { hsCode: '870322', description: '가솔린 승용차 (1,000~1,500cc)', descriptionEn: 'Passenger vehicles, spark-ignition, 1000-1500cc', chapter: '87', heading: '8703' },
  { hsCode: '870323', description: '가솔린 승용차 (1,500~3,000cc)', descriptionEn: 'Passenger vehicles, spark-ignition, 1500-3000cc', chapter: '87', heading: '8703' },
  { hsCode: '870324', description: '가솔린 승용차 (3,000cc 초과)', descriptionEn: 'Passenger vehicles, spark-ignition, >3000cc', chapter: '87', heading: '8703' },
  { hsCode: '870331', description: '디젤 승용차 (1,500cc 이하)', descriptionEn: 'Passenger vehicles, diesel, ≤1500cc', chapter: '87', heading: '8703' },
  { hsCode: '870332', description: '디젤 승용차 (1,500~2,500cc)', descriptionEn: 'Passenger vehicles, diesel, 1500-2500cc', chapter: '87', heading: '8703' },
  { hsCode: '870340', description: '전기 구동 승용차', descriptionEn: 'Electric motor vehicles for transport of persons', chapter: '87', heading: '8703' },
  { hsCode: '870421', description: '화물차 (총중량 5톤 이하, 디젤)', descriptionEn: 'Motor vehicles for goods transport, diesel, GVW ≤5t', chapter: '87', heading: '8704' },
  { hsCode: '870431', description: '화물차 (총중량 5톤 이하, 가솔린)', descriptionEn: 'Motor vehicles for goods transport, spark-ignition, GVW ≤5t', chapter: '87', heading: '8704' },
  { hsCode: '870600', description: '자동차용 섀시 (엔진 장착)', descriptionEn: 'Chassis fitted with engines for motor vehicles', chapter: '87', heading: '8706' },
  { hsCode: '870810', description: '자동차용 범퍼 및 부품', descriptionEn: 'Bumpers and parts for motor vehicles', chapter: '87', heading: '8708' },
  { hsCode: '870829', description: '자동차용 차체 부품 (기타)', descriptionEn: 'Other parts and accessories of bodies for motor vehicles', chapter: '87', heading: '8708' },
  { hsCode: '870840', description: '자동차용 기어박스 및 부품', descriptionEn: 'Gear boxes and parts for motor vehicles', chapter: '87', heading: '8708' },
  { hsCode: '870850', description: '자동차용 구동 차축 및 부품', descriptionEn: 'Drive-axles with differential for motor vehicles', chapter: '87', heading: '8708' },
  { hsCode: '870870', description: '자동차용 휠·부품·부속품', descriptionEn: 'Road wheels and parts for motor vehicles', chapter: '87', heading: '8708' },
  { hsCode: '870880', description: '자동차용 서스펜션 및 부품', descriptionEn: 'Suspension systems and parts for motor vehicles', chapter: '87', heading: '8708' },
  { hsCode: '870891', description: '자동차용 라디에이터 및 부품', descriptionEn: 'Radiators and parts for motor vehicles', chapter: '87', heading: '8708' },
  { hsCode: '870899', description: '자동차용 기타 부품·부속품', descriptionEn: 'Other parts and accessories for motor vehicles', chapter: '87', heading: '8708' },
  { hsCode: '871120', description: '모터사이클 (50~250cc)', descriptionEn: 'Motorcycles with reciprocating piston engine, 50-250cc', chapter: '87', heading: '8711' },

  // ============================================================
  // 챕터 85 — 전기기기·전자·음향·TV
  // ============================================================
  { hsCode: '850110', description: '전동기 (출력 37.5W 이하)', descriptionEn: 'Electric motors, output ≤37.5W', chapter: '85', heading: '8501' },
  { hsCode: '850140', description: '단상 교류 전동기', descriptionEn: 'AC motors, single-phase', chapter: '85', heading: '8501' },
  { hsCode: '850410', description: '변압기용 안정기 (방전램프용)', descriptionEn: 'Ballasts for discharge lamps or tubes', chapter: '85', heading: '8504' },
  { hsCode: '850440', description: '정류 변환 장치', descriptionEn: 'Static converters', chapter: '85', heading: '8504' },
  { hsCode: '850610', description: '이산화망간 전지 (1차)', descriptionEn: 'Manganese dioxide primary cells and batteries', chapter: '85', heading: '8506' },
  { hsCode: '850710', description: '납축전지 (자동차 시동용)', descriptionEn: 'Lead-acid accumulators for starting piston engines', chapter: '85', heading: '8507' },
  { hsCode: '850760', description: '리튬이온 축전지', descriptionEn: 'Lithium-ion accumulators', chapter: '85', heading: '8507' },
  { hsCode: '851712', description: '셀룰러 네트워크용 전화기', descriptionEn: 'Telephones for cellular networks (smartphones)', chapter: '85', heading: '8517' },
  { hsCode: '851762', description: '네트워크 통신 장치 (라우터 등)', descriptionEn: 'Machines for reception/transmission of data (routers, modems)', chapter: '85', heading: '8517' },
  { hsCode: '852340', description: '광학 매체 (DVD, BD 등)', descriptionEn: 'Optical media for recording', chapter: '85', heading: '8523' },
  { hsCode: '852351', description: '반도체 매체 (플래시 메모리)', descriptionEn: 'Semiconductor media, solid-state non-volatile (flash)', chapter: '85', heading: '8523' },
  { hsCode: '852580', description: 'TV 카메라·디지털 카메라', descriptionEn: 'Television cameras, digital cameras', chapter: '85', heading: '8525' },
  { hsCode: '852812', description: '컬러 모니터 (LCD 방식)', descriptionEn: 'Colour monitors with LCD/LED technology', chapter: '85', heading: '8528' },
  { hsCode: '852872', description: '컬러 TV 수상기 (LCD 방식)', descriptionEn: 'Colour television receivers with LCD/LED', chapter: '85', heading: '8528' },
  { hsCode: '854110', description: '다이오드 (발광 다이오드 제외)', descriptionEn: 'Diodes, other than photosensitive or LED', chapter: '85', heading: '8541' },
  { hsCode: '854140', description: '광전성 반도체 디바이스 (태양전지)', descriptionEn: 'Photosensitive semiconductor devices, solar cells', chapter: '85', heading: '8541' },
  { hsCode: '854231', description: '프로세서·컨트롤러 (집적회로)', descriptionEn: 'Electronic integrated circuits: processors and controllers', chapter: '85', heading: '8542' },
  { hsCode: '854232', description: '메모리 (집적회로)', descriptionEn: 'Electronic integrated circuits: memories', chapter: '85', heading: '8542' },
  { hsCode: '854233', description: '증폭기 (집적회로)', descriptionEn: 'Electronic integrated circuits: amplifiers', chapter: '85', heading: '8542' },
  { hsCode: '854239', description: '기타 집적회로', descriptionEn: 'Other electronic integrated circuits', chapter: '85', heading: '8542' },

  // ============================================================
  // 챕터 84 — 원자로·보일러·기계류
  // ============================================================
  { hsCode: '840110', description: '원자로', descriptionEn: 'Nuclear reactors', chapter: '84', heading: '8401' },
  { hsCode: '840140', description: '원자로 부분품', descriptionEn: 'Parts of nuclear reactors', chapter: '84', heading: '8401' },
  { hsCode: '840710', description: '항공기용 불꽃점화 피스톤 엔진', descriptionEn: 'Aircraft spark-ignition reciprocating piston engines', chapter: '84', heading: '8407' },
  { hsCode: '840734', description: '불꽃점화 피스톤 엔진 (1,000cc 초과)', descriptionEn: 'Spark-ignition reciprocating piston engines, >1000cc', chapter: '84', heading: '8407' },
  { hsCode: '840820', description: '압축점화 엔진 (차량용)', descriptionEn: 'Compression-ignition engines for vehicles', chapter: '84', heading: '8408' },
  { hsCode: '841112', description: '터보제트 엔진 (추력 25kN 초과)', descriptionEn: 'Turbojet engines, thrust >25kN', chapter: '84', heading: '8411' },
  { hsCode: '841191', description: '터보제트·터보프롭 부분품', descriptionEn: 'Parts of turbojet or turboprop engines', chapter: '84', heading: '8411' },
  { hsCode: '841430', description: '냉동·냉방용 압축기', descriptionEn: 'Compressors for refrigerating equipment', chapter: '84', heading: '8414' },
  { hsCode: '841480', description: '공기·가스 펌프·압축기', descriptionEn: 'Air or gas compressors, hoods', chapter: '84', heading: '8414' },
  { hsCode: '841510', description: '창문형·벽걸이형 에어컨', descriptionEn: 'Window or wall air conditioning machines', chapter: '84', heading: '8415' },
  { hsCode: '841590', description: '에어컨 부분품', descriptionEn: 'Parts of air conditioning machines', chapter: '84', heading: '8415' },
  { hsCode: '847130', description: '휴대용 디지털 자동자료처리기계 (노트북)', descriptionEn: 'Portable digital automatic data processing machines (laptops)', chapter: '84', heading: '8471' },
  { hsCode: '847141', description: '디지털 자동자료처리기계 (데스크톱)', descriptionEn: 'Digital automatic data processing machines (desktops)', chapter: '84', heading: '8471' },
  { hsCode: '847150', description: 'ADP 처리 장치 (서버 등)', descriptionEn: 'Digital processing units (servers)', chapter: '84', heading: '8471' },
  { hsCode: '847170', description: 'ADP 저장 장치 (HDD, SSD)', descriptionEn: 'Storage units for ADP machines (HDD, SSD)', chapter: '84', heading: '8471' },
  { hsCode: '847330', description: 'ADP 기계 부품·부속품', descriptionEn: 'Parts and accessories of ADP machines', chapter: '84', heading: '8473' },
  { hsCode: '847989', description: '기타 기계 (자동 판매기 등)', descriptionEn: 'Other machines and mechanical appliances', chapter: '84', heading: '8479' },
  { hsCode: '848620', description: '반도체 제조용 기계', descriptionEn: 'Machines for manufacturing semiconductor devices', chapter: '84', heading: '8486' },
  { hsCode: '848630', description: '평판 디스플레이 제조용 기계', descriptionEn: 'Machines for manufacturing flat panel displays', chapter: '84', heading: '8486' },
  { hsCode: '848690', description: '반도체·디스플레이 제조기계 부분품', descriptionEn: 'Parts for semiconductor/display manufacturing machines', chapter: '84', heading: '8486' },

  // ============================================================
  // 챕터 90 — 광학·사진·영화·측정·정밀기기
  // ============================================================
  { hsCode: '900110', description: '광섬유·광섬유 다발', descriptionEn: 'Optical fibres, optical fibre bundles and cables', chapter: '90', heading: '9001' },
  { hsCode: '900120', description: '편광 재료 시트·판', descriptionEn: 'Sheets and plates of polarising material', chapter: '90', heading: '9001' },
  { hsCode: '900150', description: '안경 렌즈 (기타 재료)', descriptionEn: 'Spectacle lenses of other materials', chapter: '90', heading: '9001' },
  { hsCode: '900190', description: '기타 광학 섬유·렌즈·프리즘', descriptionEn: 'Other optical elements (lenses, prisms, mirrors)', chapter: '90', heading: '9001' },
  { hsCode: '901310', description: '무기용 망원경 조준경', descriptionEn: 'Telescopic sights for fitting to arms', chapter: '90', heading: '9013' },
  { hsCode: '901380', description: '기타 액정 장치·광학기기', descriptionEn: 'Other liquid crystal devices, optical appliances', chapter: '90', heading: '9013' },
  { hsCode: '901839', description: '주사기·바늘·카테터 (의료용)', descriptionEn: 'Syringes, needles, catheters, cannulae (medical)', chapter: '90', heading: '9018' },
  { hsCode: '901890', description: '기타 의료·외과용 기기', descriptionEn: 'Other instruments for medical, surgical use', chapter: '90', heading: '9018' },
  { hsCode: '902150', description: '심장 박동 조율기', descriptionEn: 'Pacemakers for stimulating heart muscles', chapter: '90', heading: '9021' },
  { hsCode: '902190', description: '기타 인공 보철 장치', descriptionEn: 'Other orthopaedic or prosthetic appliances', chapter: '90', heading: '9021' },
  { hsCode: '902212', description: 'CT 스캐너 (컴퓨터 단층촬영)', descriptionEn: 'Computed tomography apparatus (CT scanners)', chapter: '90', heading: '9022' },
  { hsCode: '902214', description: '기타 의료용 X선 장치', descriptionEn: 'Other apparatus based on X-rays, for medical use', chapter: '90', heading: '9022' },
  { hsCode: '902610', description: '유량·액면 측정 기기', descriptionEn: 'Instruments for measuring liquid flow or level', chapter: '90', heading: '9026' },
  { hsCode: '902710', description: '가스·연기 분석 기기', descriptionEn: 'Gas or smoke analysis apparatus', chapter: '90', heading: '9027' },
  { hsCode: '903180', description: '기타 측정·검사용 기기', descriptionEn: 'Other measuring or checking instruments', chapter: '90', heading: '9031' },

  // ============================================================
  // 챕터 39 — 플라스틱·플라스틱 제품
  // ============================================================
  { hsCode: '390110', description: '폴리에틸렌 (비중 0.94 미만, LDPE)', descriptionEn: 'Polyethylene, specific gravity <0.94 (LDPE)', chapter: '39', heading: '3901' },
  { hsCode: '390120', description: '폴리에틸렌 (비중 0.94 이상, HDPE)', descriptionEn: 'Polyethylene, specific gravity ≥0.94 (HDPE)', chapter: '39', heading: '3901' },
  { hsCode: '390190', description: '기타 에틸렌 중합체', descriptionEn: 'Other polymers of ethylene, in primary forms', chapter: '39', heading: '3901' },
  { hsCode: '390210', description: '폴리프로필렌 (PP)', descriptionEn: 'Polypropylene, in primary forms', chapter: '39', heading: '3902' },
  { hsCode: '390230', description: '프로필렌 공중합체', descriptionEn: 'Propylene copolymers, in primary forms', chapter: '39', heading: '3902' },
  { hsCode: '390311', description: '발포성 폴리스티렌 (EPS)', descriptionEn: 'Expansible polystyrene, in primary forms', chapter: '39', heading: '3903' },
  { hsCode: '390319', description: '기타 폴리스티렌', descriptionEn: 'Other polystyrene, in primary forms', chapter: '39', heading: '3903' },
  { hsCode: '390410', description: '폴리염화비닐 (PVC, 비가소화)', descriptionEn: 'Polyvinyl chloride, not mixed with other substances', chapter: '39', heading: '3904' },
  { hsCode: '390720', description: '폴리에테르 (POM, 폴리카보네이트 등)', descriptionEn: 'Polyethers, in primary forms', chapter: '39', heading: '3907' },
  { hsCode: '390760', description: '폴리에틸렌 테레프탈레이트 (PET)', descriptionEn: 'Polyethylene terephthalate (PET), in primary forms', chapter: '39', heading: '3907' },
  { hsCode: '391721', description: '경질 에틸렌 중합체 관', descriptionEn: 'Rigid tubes, pipes of polymers of ethylene', chapter: '39', heading: '3917' },
  { hsCode: '391990', description: '기타 플라스틱 자기접착 시트·필름', descriptionEn: 'Other self-adhesive plates, sheets of plastics', chapter: '39', heading: '3919' },
  { hsCode: '392010', description: '에틸렌 중합체 판·시트·필름 (비세포질)', descriptionEn: 'Plates, sheets of polymers of ethylene, non-cellular', chapter: '39', heading: '3920' },
  { hsCode: '392020', description: '프로필렌 중합체 판·시트·필름', descriptionEn: 'Plates, sheets of polymers of propylene', chapter: '39', heading: '3920' },
  { hsCode: '392321', description: '에틸렌 중합체 포대·봉지', descriptionEn: 'Sacks and bags of polymers of ethylene', chapter: '39', heading: '3923' },
  { hsCode: '392690', description: '기타 플라스틱 제품', descriptionEn: 'Other articles of plastics', chapter: '39', heading: '3926' },

  // ============================================================
  // 챕터 72 — 철강
  // ============================================================
  { hsCode: '720110', description: '비합금 선철 (인 0.5% 이하)', descriptionEn: 'Non-alloy pig iron, phosphorus ≤0.5%', chapter: '72', heading: '7201' },
  { hsCode: '720230', description: '페로실리코망간', descriptionEn: 'Ferro-silico-manganese', chapter: '72', heading: '7202' },
  { hsCode: '720410', description: '주철·경면철 웨이스트·스크랩', descriptionEn: 'Waste and scrap of cast iron', chapter: '72', heading: '7204' },
  { hsCode: '720449', description: '기타 철강 웨이스트·스크랩', descriptionEn: 'Other ferrous waste and scrap', chapter: '72', heading: '7204' },
  { hsCode: '720610', description: '잉곳 형상의 철·비합금강', descriptionEn: 'Iron and non-alloy steel in ingots', chapter: '72', heading: '7206' },
  { hsCode: '720711', description: '반제품 (탄소 0.25% 미만, 사각단면)', descriptionEn: 'Semi-finished products of iron, C<0.25%, rectangular', chapter: '72', heading: '7207' },
  { hsCode: '720839', description: '열간압연 평판 (두께 3mm 이상)', descriptionEn: 'Hot-rolled flat products, thickness ≥3mm', chapter: '72', heading: '7208' },
  { hsCode: '720851', description: '열간압연 평판 (두께 10mm 초과)', descriptionEn: 'Hot-rolled flat products, thickness >10mm', chapter: '72', heading: '7208' },
  { hsCode: '720915', description: '냉간압연 평판 (두께 3mm 이상)', descriptionEn: 'Cold-rolled flat products, thickness ≥3mm', chapter: '72', heading: '7209' },
  { hsCode: '720917', description: '냉간압연 평판 (두께 0.5~1mm)', descriptionEn: 'Cold-rolled flat products, thickness 0.5-1mm', chapter: '72', heading: '7209' },
  { hsCode: '721030', description: '전기 아연도금 평판', descriptionEn: 'Flat-rolled products, electrolytically plated with zinc', chapter: '72', heading: '7210' },
  { hsCode: '721049', description: '기타 아연도금 평판', descriptionEn: 'Other flat-rolled products, plated with zinc', chapter: '72', heading: '7210' },
  { hsCode: '721391', description: '열간압연 봉·형강 (원형단면, 직경 14mm 미만)', descriptionEn: 'Hot-rolled bars, circular cross-section, <14mm', chapter: '72', heading: '7213' },
  { hsCode: '721420', description: '콘크리트 보강용 봉', descriptionEn: 'Bars and rods of iron, for reinforcing concrete', chapter: '72', heading: '7214' },
  { hsCode: '721913', description: '스테인리스 열간압연 평판 (3~4.75mm)', descriptionEn: 'Stainless steel hot-rolled flat products, 3-4.75mm', chapter: '72', heading: '7219' },
  { hsCode: '721934', description: '스테인리스 냉간압연 평판 (0.5~1mm)', descriptionEn: 'Stainless steel cold-rolled flat products, 0.5-1mm', chapter: '72', heading: '7219' },
  { hsCode: '722830', description: '기타 합금강 봉 (열간압연)', descriptionEn: 'Other bars/rods of alloy steel, hot-rolled', chapter: '72', heading: '7228' },

  // ============================================================
  // 챕터 29 — 유기화학품
  // ============================================================
  { hsCode: '290110', description: '비환식 포화탄화수소 (메탄, 에탄 등)', descriptionEn: 'Acyclic hydrocarbons, saturated (methane, ethane)', chapter: '29', heading: '2901' },
  { hsCode: '290121', description: '에틸렌', descriptionEn: 'Ethylene (unsaturated acyclic hydrocarbons)', chapter: '29', heading: '2901' },
  { hsCode: '290122', description: '프로펜 (프로필렌)', descriptionEn: 'Propene (propylene)', chapter: '29', heading: '2901' },
  { hsCode: '290124', description: '부타-1,3-디엔 및 이소프렌', descriptionEn: 'Buta-1,3-diene and isoprene', chapter: '29', heading: '2901' },
  { hsCode: '290220', description: '벤젠', descriptionEn: 'Benzene', chapter: '29', heading: '2902' },
  { hsCode: '290230', description: '톨루엔', descriptionEn: 'Toluene', chapter: '29', heading: '2902' },
  { hsCode: '290244', description: '자일렌 이성질체 혼합물', descriptionEn: 'Mixed xylene isomers', chapter: '29', heading: '2902' },
  { hsCode: '290250', description: '스티렌', descriptionEn: 'Styrene', chapter: '29', heading: '2902' },
  { hsCode: '290531', description: '에틸렌 글리콜', descriptionEn: 'Ethylene glycol (ethanediol)', chapter: '29', heading: '2905' },
  { hsCode: '290611', description: '멘톨', descriptionEn: 'Menthol', chapter: '29', heading: '2906' },
  { hsCode: '291736', description: '테레프탈산 및 그 염', descriptionEn: 'Terephthalic acid and its salts', chapter: '29', heading: '2917' },
  { hsCode: '292910', description: '이소시아네이트', descriptionEn: 'Isocyanates', chapter: '29', heading: '2929' },
  { hsCode: '293329', description: '기타 이미다졸 고리를 가진 화합물', descriptionEn: 'Other compounds containing an unfused imidazole ring', chapter: '29', heading: '2933' },
  { hsCode: '293339', description: '기타 피리딘 고리를 가진 화합물', descriptionEn: 'Other compounds containing an unfused pyridine ring', chapter: '29', heading: '2933' },
  { hsCode: '293499', description: '기타 핵산 및 그 염', descriptionEn: 'Other nucleic acids and their salts', chapter: '29', heading: '2934' },

  // ============================================================
  // 챕터 27 — 광물성 연료·광물유·아스팔트
  // ============================================================
  { hsCode: '270111', description: '무연탄', descriptionEn: 'Anthracite coal', chapter: '27', heading: '2701' },
  { hsCode: '270112', description: '역청탄', descriptionEn: 'Bituminous coal', chapter: '27', heading: '2701' },
  { hsCode: '270119', description: '기타 석탄', descriptionEn: 'Other coal', chapter: '27', heading: '2701' },
  { hsCode: '270900', description: '석유·역청유 (원유)', descriptionEn: 'Petroleum oils and oils from bituminous minerals, crude', chapter: '27', heading: '2709' },
  { hsCode: '271011', description: '경유·중유가 아닌 석유 (휘발유 등)', descriptionEn: 'Light petroleum oils (motor spirit, gasoline)', chapter: '27', heading: '2710' },
  { hsCode: '271012', description: '경질유 (나프타 포함)', descriptionEn: 'Light oils and preparations (incl. naphtha)', chapter: '27', heading: '2710' },
  { hsCode: '271019', description: '중유·경유 (등유, 제트연료 포함)', descriptionEn: 'Medium oils (kerosene, jet fuel)', chapter: '27', heading: '2710' },
  { hsCode: '271020', description: '석유·역청유 (바이오디젤 함유)', descriptionEn: 'Petroleum oils containing biodiesel', chapter: '27', heading: '2710' },
  { hsCode: '271111', description: '천연가스 (액화, LNG)', descriptionEn: 'Natural gas, liquefied (LNG)', chapter: '27', heading: '2711' },
  { hsCode: '271112', description: '프로판 (액화)', descriptionEn: 'Propane, liquefied', chapter: '27', heading: '2711' },
  { hsCode: '271113', description: '부탄 (액화)', descriptionEn: 'Butanes, liquefied', chapter: '27', heading: '2711' },
  { hsCode: '271121', description: '천연가스 (기체 상태)', descriptionEn: 'Natural gas in gaseous state', chapter: '27', heading: '2711' },
  { hsCode: '271312', description: '석유 코크스 (하소)', descriptionEn: 'Petroleum coke, calcined', chapter: '27', heading: '2713' },
  { hsCode: '271320', description: '석유 역청 (아스팔트)', descriptionEn: 'Petroleum bitumen (asphalt)', chapter: '27', heading: '2713' },
];

// --- SQL INSERT 생성 유틸리티 ---
export function generateInsertSql(seeds: HsCodeMasterSeed[]): string {
  const header = `-- HS 코드 마스터 시드 데이터 (${seeds.length}개)\n`;
  const escSql = (s: string) => s.replace(/'/g, "''");
  const rows = seeds.map(
    (s) =>
      `  ('${s.hsCode}', '${escSql(s.description)}', '${escSql(s.descriptionEn)}', '${s.chapter}', '${s.heading}')`
  );
  return (
    header +
    `INSERT INTO "hs_code_master" ("hs_code", "description", "description_en", "chapter", "heading")\nVALUES\n` +
    rows.join(',\n') +
    `\nON CONFLICT ("hs_code") DO NOTHING;\n`
  );
}
