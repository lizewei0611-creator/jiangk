/* 桨刻龙舟赛事 - 前端脚本
 * 功能覆盖：
 * - 通用：数据加载、工具函数、事件代理
 * - schedule.html：日期/场地/关键字筛选与分组渲染
 * - results.html：赛事/组别/队伍筛选、表格渲染、CSV 导出
 * - teams.html：赛事/组别/关键字筛选、卡片渲染与详情联动
 *
 * 依赖：/events/assets/data.json
 */

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const qs = (k) => new URLSearchParams(location.search).get(k) || "";
  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const download = (filename, text, mime = "text/plain;charset=utf-8") => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const uniq = (arr) => Array.from(new Set(arr));
  const by = (k) => (a, b) => a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0;

  // 载入数据
  let DATA = null;
  async function loadData() {
    if (DATA) return DATA;
    const base = basePath();
    const url = `${base}/assets/data.json`;
    const res = await fetch(url).catch(() => null);
    if (!res || !res.ok) {
      console.error("数据加载失败", url);
      return { events: [], schedule: [], results: [], teams: [] };
    }
    DATA = await res.json();
    return DATA;
  }

  // 根据当前页面推测资源基准路径
  function basePath() {
    // 期望目录结构：/events/{pages} 同级有 /events/assets
    // 若被部署到子路径，仍以当前文件所在目录为基准
    const script = document.currentScript?.src || "";
    try {
      const url = new URL(script, location.href);
      return url.pathname.replace(/\/app\.js.*$/, "");
    } catch {
      // 回退为相对目录
      return ".";
    }
  }

  // 初始化入口
  document.addEventListener("DOMContentLoaded", async () => {
    const path = location.pathname.toLowerCase();
    const onSchedule = path.endsWith("/schedule.html");
    const onResults = path.endsWith("/results.html");
    const onTeams = path.endsWith("/teams.html");
    const data = await loadData();

    if (onSchedule) initSchedulePage(data);
    if (onResults) initResultsPage(data);
    if (onTeams) initTeamsPage(data);
  });

  // ========== 赛程页 ==========
  function initSchedulePage(data) {
    const dateSelect = $("#date-select");
    const venueSelect = $("#venue-select");
    const qInput = $("#q");
    const list = $("#schedule-list");
    const empty = $("#schedule-empty");

    const allDates = uniq(data.schedule.map((m) => m.date)).sort();
    const allVenues = uniq(data.schedule.map((m) => m.venue)).sort();

    fillSelect(dateSelect, ["全部日期", ...allDates]);
    fillSelect(venueSelect, ["全部场地", ...allVenues]);

    // 从 URL 初始化
    dateSelect.value = qs("date") || "全部日期";
    venueSelect.value = qs("venue") || "全部场地";
    qInput.value = qs("q");

    function apply() {
      const date = dateSelect.value === "全部日期" ? "" : dateSelect.value;
      const venue = venueSelect.value === "全部场地" ? "" : venueSelect.value;
      const q = qInput.value.trim().toLowerCase();

      const filtered = data.schedule.filter((m) => {
        const matchDate = !date || m.date === date;
        const matchVenue = !venue || m.venue === venue;
        const key = `${m.event} ${m.group} ${m.round} ${m.teams?.join(
          " "
        )}`.toLowerCase();
        const matchQ = !q || key.includes(q);
        return matchDate && matchVenue && matchQ;
      });

      renderSchedule(list, filtered);
      empty.hidden = filtered.length > 0;
      updateURL({ date: date || "", venue: venue || "", q: q || "" });
    }

    dateSelect.addEventListener("change", apply);
    venueSelect.addEventListener("change", apply);
    qInput.addEventListener("input", debounce(apply, 200));

    apply();
  }

  function renderSchedule(root, items) {
    root.innerHTML = "";
    if (!items?.length) return;

    // 按日期分组
    const groups = items.reduce((acc, cur) => {
      const k = cur.date;
      acc[k] = acc[k] || [];
      acc[k].push(cur);
      return acc;
    }, {});

    Object.keys(groups)
      .sort()
      .forEach((date) => {
        const section = document.createElement("section");
        section.className = "card";
        const h3 = document.createElement("h3");
        h3.textContent = `${date}`;
        h3.style.marginTop = "0";
        section.appendChild(h3);

        const ul = document.createElement("div");
        ul.className = "list";
        groups[date].sort(by("time")).forEach((m) => {
          const div = document.createElement("div");
          div.className = "team-card"; // 复用样式
          div.innerHTML = `
          <div class="team-logo" aria-hidden="true">${m.lane || 1}</div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <strong>${m.event}</strong>
              <span class="badge">${m.group || "公开组"}</span>
              <span class="badge">${m.round || "预赛"}</span>
            </div>
            <div class="muted" style="margin-top:4px">
              ${m.venue} · ${formatTime(m.time)}
            </div>
            <div style="margin-top:6px">${(m.teams || []).join(" vs ")}</div>
          </div>
        `;
          ul.appendChild(div);
        });

        section.appendChild(ul);
        root.appendChild(section);
      });
  }

  // ========== 成绩页 ==========
  function initResultsPage(data) {
    const eventSel = $("#event-select");
    const groupSel = $("#group-select");
    const teamSel = $("#team-select");
    const tbody = $("#results-tbody");
    const empty = $("#results-empty");
    const exportBtn = $("#export-btn");

    const allEvents = uniq(
      data.results.map((r) => r.event).filter(Boolean)
    ).sort();
    fillSelect(eventSel, ["全部赛事", ...allEvents]);

    function refreshGroups() {
      const ev = eventSel.value === "全部赛事" ? "" : eventSel.value;
      const groups = uniq(
        data.results
          .filter((r) => !ev || r.event === ev)
          .map((r) => r.group)
          .filter(Boolean)
      ).sort();
      fillSelect(groupSel, ["全部组别", ...groups]);
    }

    function refreshTeams() {
      const ev = eventSel.value === "全部赛事" ? "" : eventSel.value;
      const gp = groupSel.value === "全部组别" ? "" : groupSel.value;
      const teams = uniq(
        data.results
          .filter((r) => (!ev || r.event === ev) && (!gp || r.group === gp))
          .map((r) => r.team)
          .filter(Boolean)
      ).sort();
      fillSelect(teamSel, ["全部队伍", ...teams]);
    }

    // URL 初始
    eventSel.value = qs("event") || "全部赛事";
    refreshGroups();
    groupSel.value = qs("group") || "全部组别";
    refreshTeams();
    teamSel.value = qs("team") || "全部队伍";

    function apply() {
      const ev = eventSel.value === "全部赛事" ? "" : eventSel.value;
      const gp = groupSel.value === "全部组别" ? "" : groupSel.value;
      const tm = teamSel.value === "全部队伍" ? "" : teamSel.value;

      const items = data.results
        .filter(
          (r) =>
            (!ev || r.event === ev) &&
            (!gp || r.group === gp) &&
            (!tm || r.team === tm)
        )
        .slice()
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

      renderResults(tbody, items);
      empty.hidden = items.length > 0;
      updateURL({ event: ev, group: gp, team: tm });
    }

    eventSel.addEventListener("change", () => {
      refreshGroups();
      refreshTeams();
      apply();
    });
    groupSel.addEventListener("change", () => {
      refreshTeams();
      apply();
    });
    teamSel.addEventListener("change", apply);

    exportBtn?.addEventListener("click", () => {
      const rows = [
        ["Rank", "Team", "Group", "Round", "Result", "Gap", "Event"],
      ];
      $$("#results-tbody tr").forEach((tr) => {
        const cells = Array.from(tr.children).map((td) =>
          td.textContent.trim()
        );
        rows.push(cells);
      });
      const csv = rows.map((r) => r.map(escapeCSV).join(",")).join("\n");
      download(`results-${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
    });

    apply();
  }

  function renderResults(tbody, items) {
    tbody.innerHTML = "";
    if (!items?.length) return;
    const frag = document.createDocumentFragment();
    items.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.rank ?? "-"}</td>
        <td>${r.team}</td>
        <td>${r.group || "-"}</td>
        <td>${r.round || "-"}</td>
        <td>${r.result || "-"}</td>
        <td>${r.gap ?? "-"}</td>
      `;
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
  }

  // ========== 队伍页 ==========
  function initTeamsPage(data) {
    const eventSel = $("#event-select");
    const groupSel = $("#group-select");
    const qInput = $("#q");
    const list = $("#teams-list");
    const detail = $("#team-detail");
    const empty = $("#teams-empty");

    const allEvents = uniq(
      data.events.map((e) => e.name).filter(Boolean)
    ).sort();
    fillSelect(eventSel, ["全部赛事", ...allEvents]);

    function refreshGroups() {
      const ev = eventSel.value === "全部赛事" ? "" : eventSel.value;
      const groups = uniq(
        data.teams
          .filter((t) => !ev || t.events?.includes(ev))
          .flatMap((t) => t.groups || [])
      ).sort();
      fillSelect(groupSel, ["全部组别", ...groups]);
    }

    // URL 初始
    eventSel.value = qs("event") || "全部赛事";
    refreshGroups();
    groupSel.value = qs("group") || "全部组别";
    qInput.value = qs("q");

    function apply() {
      const ev = eventSel.value === "全部赛事" ? "" : eventSel.value;
      const gp = groupSel.value === "全部组别" ? "" : groupSel.value;
      const q = qInput.value.trim().toLowerCase();

      const items = data.teams.filter((t) => {
        const matchEvent = !ev || t.events?.includes(ev);
        const matchGroup = !gp || (t.groups || []).includes(gp);
        const key = `${t.name} ${t.org || ""} ${t.city || ""}`.toLowerCase();
        const matchQ = !q || key.includes(q);
        return matchEvent && matchGroup && matchQ;
      });

      renderTeams(list, items);
      empty.hidden = items.length > 0;
      updateURL({ event: ev, group: gp, q });
      // 重置详情提示
      detail.innerHTML = `<p class="muted">选择左侧列表中的队伍以查看详情。</p>`;
    }

    eventSel.addEventListener("change", () => {
      refreshGroups();
      apply();
    });
    groupSel.addEventListener("change", apply);
    qInput.addEventListener("input", debounce(apply, 200));

    // 事件代理：点击卡片显示详情
    list.addEventListener("click", (e) => {
      const card = e.target.closest(".team-card");
      if (!card) return;
      const id = card.dataset.id;
      const team = (data.teams || []).find((t) => String(t.id) === String(id));
      if (team) renderTeamDetail($("#team-detail"), team);
    });

    apply();
  }

  function renderTeams(root, items) {
    root.innerHTML = "";
    if (!items?.length) return;
    const frag = document.createDocumentFragment();
    items.forEach((t) => {
      const card = document.createElement("div");
      card.className = "team-card";
      card.dataset.id = t.id;
      card.innerHTML = `
        <div class="team-logo" aria-hidden="true">${(
          t.abbr || (t.name || "?").slice(0, 2)
        ).toUpperCase()}</div>
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <strong>${t.name}</strong>
            ${(t.groups || [])
              .slice(0, 3)
              .map((g) => `<span class="badge">${g}</span>`)
              .join("")}
            ${
              t.groups?.length > 3
                ? `<span class="badge">+${t.groups.length - 3}</span>`
                : ""
            }
          </div>
          <div class="muted" style="margin-top:4px">
            ${t.city || "未知城市"} · ${
        t.memberCount || t.members?.length || 0
      } 人
          </div>
        </div>
      `;
      frag.appendChild(card);
    });
    root.appendChild(frag);
  }

  function renderTeamDetail(root, t) {
    const members = (t.members || [])
      .map(
        (m) => `
      <div class="member">
        <span class="name">${m.name}</span>
        <span class="role">${m.role || ""}</span>
      </div>
    `
      )
      .join("");

    root.innerHTML = `
      <h3 style="margin:0 0 8px">${t.name}</h3>
      <p class="muted" style="margin:0 0 10px">${t.org || "—"} · ${
      t.city || "—"
    }</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        ${(t.groups || [])
          .map((g) => `<span class="badge">${g}</span>`)
          .join("")}
      </div>
      ${t.bio ? `<p style="margin:8px 0">${t.bio}</p>` : ""}
      <h4 style="margin:14px 0 6px">成员</h4>
      <div class="member-list">
        ${members || `<span class="muted">暂无成员数据</span>`}
      </div>
      ${
        t.contact
          ? `
        <h4 style="margin:14px 0 6px">联系人</h4>
        <p class="muted">${t.contact.name || ""} ${
              t.contact.phone ? "· " + t.contact.phone : ""
            }</p>
      `
          : ""
      }
    `;
  }

  // ========== 组件：填充选择框、URL、工具 ==========
  function fillSelect(sel, items) {
    sel.innerHTML = items
      .map((v) => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`)
      .join("");
  }

  function escapeHTML(s = "") {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c])
    );
  }

  function escapeCSV(s = "") {
    const str = String(s);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  function debounce(fn, delay = 200) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), delay);
    };
  }

  function updateURL(params) {
    const url = new URL(location.href);
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    });
    history.replaceState(null, "", url.toString());
  }
})();
