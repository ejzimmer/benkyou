import { countSubjectsBySrsGroup } from './srsGroups';
import { SrsVial } from './SrsVial';
import { SUBJECT_TYPES, WaniKaniData } from './types';
import { VialDefs } from './VialDefs';

type SrsProgressProps = { data: WaniKaniData };

export function SrsProgress({ data }: SrsProgressProps) {
  const subjectCounts = countSubjectsBySrsGroup(
    data.subjects,
    data.assignments,
  );

  return (
    <section className="srs-vials">
      <VialDefs />
      {SUBJECT_TYPES.map((type, index) => (
        <SrsVial
          key={type}
          type={type}
          index={index}
          {...subjectCounts[type]}
        />
      ))}
    </section>
  );
}
