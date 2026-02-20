// 1. 환율 정보 (무료 오픈 API 활용)
export async function getExchangeRate() {
  try {
    // 한국 원화(KRW) 기준 주요국 환율
    const res = await fetch("https://open.er-api.com/v6/latest/KRW");
    const data = await res.json();
    return {
      USD: (1 / data.rates.USD).toFixed(2), // 1달러당 원화
      VND: (1 / data.rates.VND).toFixed(4), // 1동당 원화
      MYR: (1 / data.rates.MYR).toFixed(2), // 1링깃당 원화 (사장님 계신 곳!)
    };
  } catch (e) {
    console.error("환율 로딩 실패", e);
    return null;
  }
}

// 2. 날씨 정보 (OpenWeatherMap 무료 키가 없다면 일단 샘플 데이터로 틀만 잡습니다)
export async function getTravelWeather(city: string) {
  // 실제 서비스 시에는 사장님의 OpenWeatherMap API 키를 사용하세요.
  // 지금은 로직 확인을 위해 '말레이시아'와 '베트남' 날씨를 타겟팅합니다.
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=3.13&longitude=101.68&current_weather=true`); // 쿠알라룸푸르 예시
    const data = await res.json();
    return {
      temp: data.current_weather.temperature,
      status: data.current_weather.weathercode, // 이 코드를 에밀리식 언어로 치환할 예정
    };
  } catch (e) {
    return { temp: "알 수 없음", status: "데이터 안 옴" };
  }
}
