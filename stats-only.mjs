for (const table of document.querySelectorAll('[data-sort-stats]')) {
  table.addEventListener('click', event => {
    const button = event.target.closest('[data-sort]'); if (!button) return;
    const th = button.closest('th'), index = [...th.parentNode.children].indexOf(th);
    const ascending = th.getAttribute('aria-sort') !== 'ascending';
    for (const header of table.querySelectorAll('th')) header.setAttribute('aria-sort','none');
    th.setAttribute('aria-sort',ascending ? 'ascending' : 'descending');
    const rows = [...table.tBodies[0].rows];
    const value = row => row.cells[index].dataset.value;
    const numeric = !['name','team'].includes(button.dataset.sort);
    rows.sort((a,b) => {
      const av=value(a),bv=value(b); if (!av) return 1; if (!bv) return -1;
      const delta = numeric ? Number(av.replace('−','-')) - Number(bv.replace('−','-')) : av.localeCompare(bv);
      return ascending ? delta : -delta;
    });
    table.tBodies[0].append(...rows);
  });
}
