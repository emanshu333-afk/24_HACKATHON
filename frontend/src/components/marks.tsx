import { grade, percent, totals, type Mark } from '../services/model'

export function Marks({ marks }: { marks: Mark[] }) {
  const total = totals(marks)
  return <div className="table-scroll"><table><caption className="sr-only">Subject marks</caption><thead><tr><th scope="col">Subject</th><th scope="col">Marks earned</th><th scope="col">Maximum</th></tr></thead><tbody>{marks.map(mark => <tr key={mark.subject}><th scope="row">{mark.subject}</th><td>{mark.scored}</td><td>{mark.maximum}</td></tr>)}</tbody><tfoot><tr><th scope="row">Total</th><td>{total.scored}</td><td>{total.maximum}</td></tr></tfoot></table></div>
}
export function Score({ marks }: { marks: Mark[] }) { return <div className="score"><span>Overall score <strong>{percent(marks)}%</strong></span><span>Demo grade <strong>{grade(marks)}</strong></span></div> }
