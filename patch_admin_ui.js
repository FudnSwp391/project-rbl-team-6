const fs = require('fs');

let code = fs.readFileSync('frontend/src/AdminDashboard.jsx', 'utf8');

// The UserDetailPanel signature:
// function UserDetailPanel({ user, detail, loading, onBan, actionId }) {
// Let's add an `onReleaseHold` prop and pass it down.

// 1. Add handleReleaseHold in AdminDashboard component
const fetchDetailRegex = /async function fetchDetail\(userId\) \{/;
const handleReleaseHoldStr = `
  async function handleReleaseHold(userId) {
    if (!confirm('Bạn có chắc chắn muốn nhả toàn bộ tiền cọc của gia sư này không?')) return;
    try {
      const res = await authFetch(\`\${API}/api/admin/tutors/\${userId}/release-hold\`, token, { method: 'POST' });
      setUMToast({ msg: res.message || 'Đã nhả cọc thành công.', type: 'success' });
      // reload detail
      fetchDetail(userId);
    } catch (err) {
      setUMToast({ msg: \`Lỗi nhả cọc: \${err.message}\`, type: 'error' });
    }
  }

  async function fetchDetail(userId) {`;

code = code.replace(fetchDetailRegex, handleReleaseHoldStr);

// 2. Add onReleaseHold prop to UserDetailPanel declaration
const detailPanelRegex = /function UserDetailPanel\(\{ user, detail, loading, onBan, actionId \}\) \{/;
const detailPanelReplacement = `function UserDetailPanel({ user, detail, loading, onBan, actionId, onReleaseHold }) {`;
code = code.replace(detailPanelRegex, detailPanelReplacement);

// 3. Add UI for Release Hold inside UserDetailPanel (in the tutor section)
const tutorDetailsRegex = /\{\/\* Tutor specifics \*\/\}([\s\S]*?)<InfoRow icon="menu_book"/;
// Wait, the detail rendering is:
/*
          {detail.role === 'tutor' && detail.tutor_profile && (
            <div className="pt-5 mt-5 border-t border-outline-variant space-y-3">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Hồ sơ Gia sư</h4>
              <InfoRow icon="menu_book" label="Môn học" value={detail.tutor_profile.subjects?.join(', ') || '—'} />
*/
const tutorDetailsRegex2 = /<h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Hồ sơ Gia sư<\/h4>/;
const tutorDetailsReplacement = `<h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Hồ sơ Gia sư</span>
                {detail.wallet && detail.wallet.held_balance > 0 && (
                  <button onClick={() => onReleaseHold(detail.id)} className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs transition-colors flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[14px]">lock_open</span>
                    Nhả cọc ({Number(detail.wallet.held_balance).toLocaleString('vi-VN')}đ)
                  </button>
                )}
              </h4>`;
code = code.replace(tutorDetailsRegex2, tutorDetailsReplacement);

// 4. Pass onReleaseHold to UserDetailPanel from AdminDashboard
const usageRegex = /<UserDetailPanel\s*detail=\{detail\}\s*loading=\{detailLoading\}\s*user=\{selectedUser\}\s*onBan=\{handleBan\}\s*actionId=\{actionId\}\s*\/>/;
const usageReplacement = `<UserDetailPanel
            detail={detail}
            loading={detailLoading}
            user={selectedUser}
            onBan={handleBan}
            actionId={actionId}
            onReleaseHold={handleReleaseHold}
          />`;
code = code.replace(usageRegex, usageReplacement);

fs.writeFileSync('frontend/src/AdminDashboard.jsx', code, 'utf8');
console.log('Patched AdminDashboard.jsx with Release Hold button');
