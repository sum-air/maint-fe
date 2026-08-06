import { apiGet } from '../../shared/lib/api.js'

/**
 * 운항일별 운항 현황.
 *
 * ⚠️ `date` 는 **GMT 기준 운항일**이다. 국내선 마지막 편이 KST 새벽에 도착해서,
 *    현지 자정으로 자르면 같은 운항일이 이틀로 쪼개진다. 백엔드가 원천(MVT)의
 *    날짜 키를 그대로 쓰고, 화면도 같은 기준으로 하루를 센다.
 *
 * 모든 시각은 UTC ISO 문자열이거나 null 이다. KST 변환은 화면에서 한다.
 */
export function fetchFlights(operatingDate) {
  return apiGet('/flights', { date: operatingDate })
}
