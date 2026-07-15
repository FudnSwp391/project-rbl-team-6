/**
 * TieuHocSubjectsPage — wrapper mỏng quanh SubjectsLevelPage với data cấp Tiểu học.
 * (Trước đây là ~720 dòng copy của 2 trang cấp còn lại.)
 */
import SubjectsLevelPage from './SubjectsLevelPage';
import { TIEU_HOC_LEVEL } from './constants/subjectLevels';

export default function TieuHocSubjectsPage(props) {
  return <SubjectsLevelPage config={TIEU_HOC_LEVEL} {...props} />;
}
