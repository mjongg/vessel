/** The Vessel mark (a bowl holding what matters) with the serif wordmark. Inline, so it inherits size and needs no image request. */
export function VesselMark({size=34}:{size?:number}){return <svg className="vessel-mark" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true"><path d="M8 23h32a16 16 0 0 1-32 0Z" fill="currentColor"/><circle cx="24" cy="14" r="6.5" fill="#8473b6"/></svg>}
export function VesselLogo(){return <span className="vessel-logo" role="img" aria-label="Vessel"><VesselMark/><span className="vessel-wordmark" aria-hidden="true">Vessel</span></span>}
