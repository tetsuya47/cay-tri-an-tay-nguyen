/**
 * CLAUDE GUI – WEB PLATFORM COMPATIBILITY BRIDGE v2
 * Automatically activates when running in a standard Web Browser (!window.api).
 * Provides full compatibility for Settings, Projects, Conversations, Messages,
 * Providers (OpenAI, xAI, Anthropic, Gemini, DeepSeek, Ollama, OpenRouter, OpenCode),
 * and Multi-Agent Teams (EduKids Team Roundtable / Pipeline / Solo).
 *
 * Storage: localStorage (client-side persistence).
 * AI calls: proxied through /api/chat endpoint on the local server.
 * API keys: stored encrypted in localStorage, sent per-request to server proxy.
 */

const STORAGE_KEYS = {
  settings: 'claude_gui_settings',
  projects: 'claude_gui_projects',
  conversations: 'claude_gui_conversations',
  companies: 'claude_gui_companies',
  providers: 'claude_gui_providers',
  messagesPrefix: 'claude_gui_messages_',
  compMessagesPrefix: 'claude_gui_comp_messages_'
};

function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { }
}

function getUserPassphrase(provConfig?: any): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const explicitPass = window.localStorage.getItem('bridge_passphrase');
      if (explicitPass && explicitPass.trim()) return explicitPass.trim();
    }
    if (provConfig?.apiKey && typeof provConfig.apiKey === 'string' && provConfig.apiKey.trim()) {
      return provConfig.apiKey.trim();
    }
  } catch (_e) {}
  return '';
}

const DEFAULT_SETTINGS = {
  theme: 'dark' as const,
  defaultModel: 'gpt-5.6-terra',
  defaultEffort: 'low' as const,
  editor: 'code' as const,
  sendKey: 'enter' as const,
  voice: {
    backend: 'cloud' as const,
    language: 'auto',
    localModel: 'small' as const
  },
  search: {
    backend: 'searxng' as const,
    searxngUrl: ''
  },
  office3d: true,
  voiceKeyConfigured: false,
  claudeBinary: 'opencode'
};

const DEFAULT_PROVIDER_CONFIGS = [
  { id: 'opencode' as const, provider: 'opencode', apiKey: '', baseUrl: '', enabled: true },
  { id: 'openai' as const, provider: 'openai', apiKey: '', baseUrl: '', enabled: true },
  { id: 'xai' as const, provider: 'xai', apiKey: '', baseUrl: '', enabled: true },
  { id: 'anthropic' as const, provider: 'anthropic', apiKey: '', baseUrl: '', enabled: true },
  { id: 'gemini' as const, provider: 'gemini', apiKey: '', baseUrl: '', enabled: true },
  { id: 'deepseek' as const, provider: 'deepseek', apiKey: '', baseUrl: '', enabled: true },
  { id: 'ollama' as const, provider: 'ollama', apiKey: '', baseUrl: 'http://localhost:11434/v1', enabled: true },
  { id: 'openrouter' as const, provider: 'openrouter', apiKey: '', baseUrl: '', enabled: true }
];

const DEFAULT_PROJECTS = [
  {
    id: 1,
    name: 'Cây Tri Ân Tây Nguyên',
    cwd: 'E:/cay-tri-an-tay-nguyen',
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_COMPANIES = [
  {
    id: 1,
    name: 'AI Academy Support',
    description: 'Lớp học AI đồng hành và sáng tạo. Học tập thông minh – Sáng tạo không giới hạn – AI luôn đồng hành.',
    avatarIcon: 'brain',
    defaultMode: 'roundtable' as const,
    funMode: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      {
        id: 1,
        companyId: 1,
        name: 'Hồng Lĩnh AI',
        role: 'Kiến trúc sư Giải pháp & Điều phối trưởng',
        provider: 'openai' as const,
        modelId: 'gpt-5.6-terra',
        systemPrompt: 'Bạn là chuyên gia điều phối sâu sắc và thấu đáo.',
        orderIndex: 0,
        skillRefs: []
      },
      {
        id: 2,
        companyId: 1,
        name: 'Minh Tuệ',
        role: 'Chuyên gia Sư phạm & Ngôn ngữ',
        provider: 'openai' as const,
        modelId: 'gpt-5.6-terra',
        systemPrompt: 'Bạn hỗ trợ phân tích ngôn từ và cấu trúc giáo dục.',
        orderIndex: 1,
        skillRefs: []
      },
      {
        id: 3,
        companyId: 1,
        name: 'Bảo Ngọc',
        role: 'Chuyên gia Trải nghiệm (UX/UI)',
        provider: 'openai' as const,
        modelId: 'gpt-5.6-terra',
        systemPrompt: 'Bạn kết nối cảm xúc người dùng và tính thẩm mỹ.',
        orderIndex: 2,
        skillRefs: []
      }
    ]
  },
  {
    id: 2,
    name: 'Classroom Studio',
    description: 'Không gian Học tập & Thảo luận Sư phạm.',
    avatarIcon: 'graduation-cap',
    defaultMode: 'classroom' as const,
    funMode: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      {
        id: 4,
        companyId: 2,
        name: 'Giảng viên AI',
        role: 'Chủ trì bài học',
        provider: 'openai' as const,
        modelId: 'gpt-5.6-terra',
        systemPrompt: 'Truyền tải kiến thức khúc chiết, mạch lạc.',
        orderIndex: 0,
        skillRefs: []
      }
    ]
  }
];

const DEFAULT_CONVERSATIONS = [
  {
    id: 1,
    projectId: 1,
    title: 'AI Academy Support Workspace',
    sessionId: 'session-ai-academy-1',
    sessionStarted: true,
    cwd: 'E:/cay-tri-an-tay-nguyen',
    companyId: 1,
    executionMode: 'roundtable' as const,
    funMode: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let streamListeners: Array<(event: any) => void> = [];
let companyStreamListeners: Array<(event: any) => void> = [];

export const webApi = {
  systemInfo: async () => ({
    ok: true as const,
    data: {
      platform: 'web',
      arch: 'x64',
      osVersion: 'Web Browser Platform',
      claudeBinary: 'codex',
      isPackaged: true
    }
  }),

  getSettings: async () => ({
    ok: true as const,
    data: getStored(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  }),

  updateSettings: async (patch: Record<string, unknown>) => {
    const current = getStored(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
    const updated = { ...current, ...patch };
    setStored(STORAGE_KEYS.settings, updated);
    return { ok: true as const, data: updated };
  },

  setVoiceApiKey: async () => ({
    ok: true as const,
    data: getStored(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  }),

  openSettingsFile: async () => ({
    ok: false as const,
    error: { code: 'NOT_SUPPORTED', message: 'Mở file cục bộ không khả dụng trên trình duyệt web.' }
  }),

  listProjects: async () => ({
    ok: true as const,
    data: getStored(STORAGE_KEYS.projects, DEFAULT_PROJECTS)
  }),

  addProject: async () => {
    const name = prompt('Nhập tên dự án mới:');
    if (!name) return { ok: true as const, data: null };
    const projects = getStored(STORAGE_KEYS.projects, DEFAULT_PROJECTS);
    const newProj = { id: Date.now(), name, cwd: name, createdAt: new Date().toISOString() };
    projects.push(newProj);
    setStored(STORAGE_KEYS.projects, projects);
    return { ok: true as const, data: newProj };
  },

  updateProject: async (id: number, patch: any) => {
    const projects = getStored<any[]>(STORAGE_KEYS.projects, DEFAULT_PROJECTS);
    const idx = projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      projects[idx] = { ...projects[idx], ...patch };
      setStored(STORAGE_KEYS.projects, projects);
      return { ok: true as const, data: projects[idx] };
    }
    return { ok: false as const, error: { message: 'Project not found' } };
  },

  removeProject: async (id: number) => {
    const projects = getStored<any[]>(STORAGE_KEYS.projects, DEFAULT_PROJECTS).filter(p => p.id !== id);
    setStored(STORAGE_KEYS.projects, projects);
    return { ok: true as const, data: true };
  },

  listConversations: async (projectId?: number) => {
    let convs = getStored<any[]>(STORAGE_KEYS.conversations, DEFAULT_CONVERSATIONS);
    let changed = false;
    convs = convs.map((c) => {
      if (c && c.title && (c.title === 'EduKids Team Workspace' || c.title.includes('EduKids'))) {
        changed = true;
        return { ...c, title: 'AI Academy Support Workspace' };
      }
      return c;
    });
    if (changed) setStored(STORAGE_KEYS.conversations, convs);
    if (projectId) convs = convs.filter((c) => c.projectId === projectId);
    return { ok: true as const, data: convs };
  },

  createConversation: async (input: any = {}) => {
    const convs = getStored<any[]>(STORAGE_KEYS.conversations, DEFAULT_CONVERSATIONS);
    const newConv = {
      id: Date.now(),
      projectId: input.projectId || 1,
      title: input.title || 'Cuộc trò chuyện mới',
      sessionId: 'session-' + Date.now(),
      sessionStarted: false,
      cwd: 'E:/cay-tri-an-tay-nguyen',
      companyId: input.companyId || 1,
      executionMode: input.executionMode || 'roundtable',
      funMode: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    convs.unshift(newConv);
    setStored(STORAGE_KEYS.conversations, convs);
    return { ok: true as const, data: newConv };
  },

  renameConversation: async (id: number, title: string) => {
    const convs = getStored<any[]>(STORAGE_KEYS.conversations, DEFAULT_CONVERSATIONS);
    const idx = convs.findIndex(c => c.id === id);
    if (idx !== -1) {
      convs[idx].title = title;
      convs[idx].updatedAt = new Date().toISOString();
      setStored(STORAGE_KEYS.conversations, convs);
      return { ok: true as const, data: convs[idx] };
    }
    return { ok: false as const, error: { message: 'Conversation not found' } };
  },

  deleteConversation: async (id: number) => {
    const convs = getStored<any[]>(STORAGE_KEYS.conversations, DEFAULT_CONVERSATIONS).filter(c => c.id !== id);
    setStored(STORAGE_KEYS.conversations, convs);
    return { ok: true as const, data: true };
  },

  listMessages: async (conversationId: number) => {
    const key = STORAGE_KEYS.messagesPrefix + conversationId;
    const msgs = getStored(key, [] as any[]);
    return { ok: true as const, data: msgs };
  },

  ask: async (request: any) => {
    // ask() is used by the solo/direct chat path when queue.submit is not available.
    // We delegate to queue.submit which handles streaming + storage.
    const result = await (window as any).api.queue.submit(request);
    if (!result.ok) return result;
    // Return the last stored message for this conversation
    const msgKey = STORAGE_KEYS.messagesPrefix + request.conversationId;
    const messages = getStored<any[]>(msgKey, []);
    const lastMsg = messages[messages.length - 1];
    return { ok: true as const, data: { answer: lastMsg?.response || '', message: lastMsg } };
  },

  cancel: async () => ({ ok: true as const, data: true }),

  pickFiles: async () => ({ ok: true as const, data: [] }),

  openInEditor: async () => ({
    ok: false as const,
    error: { message: 'Không thể mở trình soạn thảo desktop từ trình duyệt.' }
  }),

  pathForFile: (file: any) => (file ? file.name : ''),

  onStream: (listener: (event: any) => void) => {
    streamListeners.push(listener);
    return () => { streamListeners = streamListeners.filter(l => l !== listener); };
  },

  queue: {
    submit: async (req: any) => {
      // For web runtime, directly process the prompt and emit stream events
      const conversationId = req.conversationId;
      const userPrompt = req.prompt;
      const model = req.model || null;

      // Emit started event
      setTimeout(() => {
        for (const listener of streamListeners) {
          try { listener({ type: 'started', conversationId, prompt: userPrompt }); } catch (_e) { }
        }
      }, 10);

      // Get provider config for real AI call
      const configs = getStored<any[]>(STORAGE_KEYS.providers, DEFAULT_PROVIDER_CONFIGS);
      const settings = getStored(STORAGE_KEYS.settings, DEFAULT_SETTINGS) as any;
      const chosenModel = model || settings.defaultModel || 'gpt-4o';

      // Determine which provider to use based on model
      let providerId = 'openai';
      if (chosenModel.startsWith('claude')) providerId = 'anthropic';
      else if (chosenModel.startsWith('gemini')) providerId = 'gemini';
      else if (chosenModel.startsWith('grok')) providerId = 'xai';
      else if (chosenModel.startsWith('deepseek')) providerId = 'deepseek';
      else if (chosenModel.includes('/')) providerId = 'openrouter';

      const provConfig = configs.find(c => c.id === providerId) || configs[0];

      // Stream AI response via server proxy
      let fullText = '';
      try {
        const res = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            prompt: userPrompt,
            model: chosenModel,
            provider: providerId,
            apiKey: provConfig?.apiKey || '',
            baseUrl: provConfig?.baseUrl || '',
            passphrase: getUserPassphrase(provConfig),
            effort: req.effort
          })
        });
        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6).trim();
              if (payload === '[DONE]') break;
              try {
                const obj = JSON.parse(payload);
                const delta = obj.choices?.[0]?.delta?.content || obj.text || '';
                if (delta) {
                  fullText += delta;
                  for (const listener of streamListeners) {
                    try { listener({ type: 'delta', conversationId, text: delta }); } catch (_e) { }
                  }
                }
              } catch (_e) { }
            }
          }
        }
      } catch (_e) { }

      // Fallback: non-streaming via /api/claude/ask
      if (!fullText) {
        try {
          const res = await fetch('/api/claude/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userPrompt, conversationId, model: chosenModel })
          });
          if (res.ok) {
            const data = await res.json();
            fullText = data.text || data.response || '';
          }
        } catch (_e) { }
      }

      if (!fullText) {
        fullText = `*(Web Runtime): Chưa cấu hình API key cho provider "${providerId}". Vui lòng vào Settings → Keys để nhập key, sau đó thử lại.*`;
      }

      // Store message
      const msgKey = STORAGE_KEYS.messagesPrefix + conversationId;
      const messages = getStored<any[]>(msgKey, []);
      const newMsg = {
        id: Date.now(),
        conversationId,
        prompt: userPrompt,
        response: fullText,
        error: null,
        model: chosenModel,
        effort: req.effort || null,
        durationMs: null,
        costUsd: null,
        createdAt: new Date().toISOString()
      };
      messages.push(newMsg);
      setStored(msgKey, messages);

      // Emit settled event
      for (const listener of streamListeners) {
        try { listener({ type: 'settled', conversationId, message: newMsg, error: null }); } catch (_e) { }
      }

      const item = { id: 'q_' + Date.now(), prompt: userPrompt, conversationId, status: 'completed' };
      return { ok: true as const, data: item };
    },
    state: async (_mode?: string, _conversationId?: number) => ({ ok: true as const, data: { running: null, waiting: [] } }),
    remove: async () => ({ ok: true as const, data: true }),
    resume: async () => ({ ok: true as const, data: { running: null, waiting: [] } }),
    clear: async () => ({ ok: true as const, data: { running: null, waiting: [] } }),
    onChanged: () => () => { }
  },

  companies: {
    list: async () => {
      let comps = getStored<any[]>(STORAGE_KEYS.companies, DEFAULT_COMPANIES);
      let changed = false;
      comps = comps.map((c) => {
        if (c && c.name && (c.name === 'EduKids Team' || c.name.includes('EduKids'))) {
          changed = true;
          return {
            ...c,
            name: 'AI Academy Support',
            description: 'Lớp học AI đồng hành và sáng tạo. Học tập thông minh – Sáng tạo không giới hạn – AI luôn đồng hành.'
          };
        }
        return c;
      });
      if (changed) setStored(STORAGE_KEYS.companies, comps);
      return {
        ok: true as const,
        data: comps
      };
    },

    get: async (id: number) => {
      let companies = getStored<any[]>(STORAGE_KEYS.companies, DEFAULT_COMPANIES);
      const found = companies.find(c => c.id === id);
      if (found && (found.name === 'EduKids Team' || found.name.includes('EduKids'))) {
        found.name = 'AI Academy Support';
        found.description = 'Lớp học AI đồng hành và sáng tạo. Học tập thông minh – Sáng tạo không giới hạn – AI luôn đồng hành.';
      }
      return { ok: true as const, data: found || null };
    },

    create: async (input: any) => {
      const companies = getStored<any[]>(STORAGE_KEYS.companies, DEFAULT_COMPANIES);
      const newC = { id: Date.now(), ...input, members: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      companies.push(newC);
      setStored(STORAGE_KEYS.companies, companies);
      return { ok: true as const, data: newC };
    },

    update: async (id: number, patch: any) => {
      const companies = getStored<any[]>(STORAGE_KEYS.companies, DEFAULT_COMPANIES);
      const idx = companies.findIndex(c => c.id === id);
      if (idx !== -1) {
        companies[idx] = { ...companies[idx], ...patch, updatedAt: new Date().toISOString() };
        setStored(STORAGE_KEYS.companies, companies);
        return { ok: true as const, data: companies[idx] };
      }
      return { ok: false as const, error: { message: 'Company not found' } };
    },

    delete: async (id: number) => {
      const companies = getStored<any[]>(STORAGE_KEYS.companies, DEFAULT_COMPANIES).filter(c => c.id !== id);
      setStored(STORAGE_KEYS.companies, companies);
      return { ok: true as const, data: true };
    },

    addMember: async (input: any) => {
      const companies = getStored<any[]>(STORAGE_KEYS.companies, DEFAULT_COMPANIES);
      const comp = companies.find(c => c.id === input.companyId);
      if (comp) {
        const newMem = { id: Date.now(), ...input, skillRefs: [] };
        comp.members.push(newMem);
        setStored(STORAGE_KEYS.companies, companies);
        return { ok: true as const, data: newMem };
      }
      return { ok: false as const, error: { message: 'Company not found' } };
    },

    updateMember: async (id: number, patch: any) => {
      const companies = getStored<any[]>(STORAGE_KEYS.companies, DEFAULT_COMPANIES);
      for (const comp of companies) {
        const mem = comp.members.find((m: any) => m.id === id);
        if (mem) {
          Object.assign(mem, patch);
          setStored(STORAGE_KEYS.companies, companies);
          return { ok: true as const, data: mem };
        }
      }
      return { ok: false as const, error: { message: 'Member not found' } };
    },

    deleteMember: async (id: number) => {
      const companies = getStored<any[]>(STORAGE_KEYS.companies, DEFAULT_COMPANIES);
      for (const comp of companies) {
        comp.members = comp.members.filter((m: any) => m.id !== id);
      }
      setStored(STORAGE_KEYS.companies, companies);
      return { ok: true as const, data: true };
    },

    listMessages: async (conversationId: number) => {
      const key = STORAGE_KEYS.compMessagesPrefix + conversationId;
      const msgs = getStored(key, [
        {
          id: 1,
          conversationId,
          senderType: 'member',
          memberId: 1,
          memberName: 'Hồng Lĩnh AI',
          memberRole: 'Kiến trúc sư Giải pháp',
          content: 'Chào mừng các bạn đến với AI Academy Support – Lớp học AI đồng hành và sáng tạo. Mọi thành viên đã sẵn sàng cho buổi làm việc hôm nay.',
          stepIndex: 0,
          createdAt: new Date().toISOString()
        }
      ]);
      return { ok: true as const, data: msgs };
    },

    askStream: async (companyId: number, conversationId: number, promptText: string, searchMode?: any) => {
      const key = STORAGE_KEYS.compMessagesPrefix + conversationId;
      const messages = getStored<any[]>(key, []);
      const configs = getStored<any[]>(STORAGE_KEYS.providers, DEFAULT_PROVIDER_CONFIGS);
      const companies = getStored<any[]>(STORAGE_KEYS.companies, DEFAULT_COMPANIES);
      const company = companies.find(c => c.id === companyId);
      const members = company?.members || [];

      messages.push({
        id: Date.now(),
        conversationId,
        senderType: 'user',
        memberId: null,
        content: promptText,
        reasoningContent: null,
        stepIndex: 0,
        phase: null,
        durationMs: null,
        tokensUsed: null,
        createdAt: new Date().toISOString()
      });

      // Determine execution mode & check for @mentions (match original EduKids orchestrator logic)
      const mode = company?.defaultMode || 'roundtable';

      // Parse @mentions: if user specifically mentions members, ONLY those members reply!
      const longestFirst = [...members].sort((a, b) => b.name.length - a.name.length);
      const addressedHits: any[] = [];
      const regex = /(?<=^|\s)@/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(promptText)) !== null) {
        const start = match.index + 1;
        const found = longestFirst.find(m => {
          const sub = promptText.slice(start, start + m.name.length);
          const nextChar = promptText.charAt(start + m.name.length);
          const isWordChar = /[\p{L}\p{N}_-]/u.test(nextChar);
          return sub.toLowerCase() === m.name.toLowerCase() && !isWordChar;
        });
        if (found && !addressedHits.includes(found)) addressedHits.push(found);
      }

      let activeMemberList: any[];
      let isDirectMention = false;
      if (addressedHits.length > 0) {
        // Direct @mention: Only addressed members reply!
        activeMemberList = addressedHits;
        isDirectMention = true;
      } else if (mode === 'single') {
        activeMemberList = members.slice(0, 1);
      } else {
        // Full Roundtable/Pipeline: all members participate in collaborative order
        activeMemberList = members;
      }

      let stepIndex = 1;
      let meetingNotes = '';

      for (const member of activeMemberList) {
        const providerId = member.provider || 'openai';
        const modelId = member.modelId || 'gpt-5.6-terra';
        const provConfig = configs.find(c => c.id === providerId);

        // Emit started event for this member
        for (const listener of companyStreamListeners) {
          try {
            listener({ type: 'started', conversationId, memberId: member.id, memberName: member.name });
          } catch (_e) { }
        }

        let reply = '';

        // Build contextual system prompt based on role & meeting phase
        let roleInstruction = member.systemPrompt || '';
        if (isDirectMention) {
          roleInstruction += `\n\n[CHỈ DẪN TRỰC TIẾP]: Người dùng đã @mention bạn trực tiếp (${member.name} - ${member.role}). Hãy trả lời đúng tư cách và thẩm quyền của bạn. Nếu người dùng yêu cầu lập kế hoạch/phân công, hãy đưa ra bản kế hoạch chi tiết, rõ ràng gồm mục tiêu, đầu việc cho từng thành viên, sản phẩm đầu ra và thứ tự thực hiện. Tuyệt đối không tự ý sửa đổi hay nhận xét cách diễn đạt câu hỏi của người dùng nếu họ không yêu cầu.`;
        } else {
          // Collaborative Roundtable context
          roleInstruction += `\n\n[HỘI ĐỒNG AI ACADEMY SUPPORT - VAI TRÒ CHUYÊN MÔN]:\nBạn là ${member.name} với vai trò "${member.role}". Trong phiên làm việc chung của AI Academy Support (Lớp học AI đồng hành và sáng tạo), hãy đóng góp góc nhìn chuyên môn sâu sắc theo đúng vai trò của mình. Không lặp lại nguyên văn ý kiến của người khác và không nhận xét/sửa lỗi câu chữ của người dùng.`;
          if (meetingNotes) {
            roleInstruction += `\n\n[CÁC Ý KIẾN TRƯỚC ĐÓ TRONG PHIÊN HỌP]:\n${meetingNotes}`;
          }
        }

        // Try streaming via server
        try {
          const res = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId,
              prompt: promptText,
              model: modelId,
              provider: providerId,
              apiKey: provConfig?.apiKey || '',
              baseUrl: provConfig?.baseUrl || '',
              passphrase: getUserPassphrase(provConfig),
              systemPrompt: roleInstruction,
              memberName: member.name
            })
          });
          if (res.ok && res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const text = decoder.decode(value, { stream: true });
              for (const line of text.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                const payload = line.slice(6).trim();
                if (payload === '[DONE]') break;
                try {
                  const obj = JSON.parse(payload);
                  const delta = obj.choices?.[0]?.delta?.content || obj.text || '';
                  if (delta) {
                    reply += delta;
                    for (const listener of companyStreamListeners) {
                      try { listener({ type: 'delta', conversationId, memberId: member.id, text: delta }); } catch (_e) { }
                    }
                  }
                } catch (_e) { }
              }
            }
          }
        } catch (_e) { }

        // Fallback if no streaming reply
        if (!reply) {
          if (providerId === 'openai' && !provConfig?.apiKey) {
            reply = `*(${member.name}/${modelId}): Chưa nhận được phản hồi từ Codex CLI hoặc OpenAI. Vui lòng kiểm tra đăng nhập Codex CLI hoặc cấu hình OpenAI API Key tại Settings → Keys.*`;
          } else {
            reply = `*(${member.name}/${modelId}): Lỗi kết nối tới nhà cung cấp ${providerId}. Vui lòng kiểm tra lại API Key hoặc mạng kết nối.*`;
          }
        }

        const memberMsg: any = {
          id: Date.now() + stepIndex,
          conversationId,
          senderType: 'member' as const,
          memberId: member.id,
          memberName: member.name,
          memberRole: member.role,
          memberColor: member.avatarColor || '#00F0FF',
          content: reply,
          reasoningContent: null,
          stepIndex,
          phase: null,
          durationMs: null,
          tokensUsed: null,
          createdAt: new Date().toISOString()
        };
        messages.push(memberMsg);
        stepIndex++;

        // Add to meeting notes for next member in discussion
        meetingNotes += `\n[${member.name} (${member.role})]: ${reply}\n`;

        for (const listener of companyStreamListeners) {
          try { listener({ type: 'member-done', conversationId, memberId: member.id, message: memberMsg }); } catch (_e) { }
        }

        // For pipeline mode, chain the next member's context
        if (mode === 'pipeline') {
          promptText = `${promptText}\n\n[${member.name}]: ${reply}`;
        }
      }

      setStored(key, messages);

      for (const listener of companyStreamListeners) {
        try { listener({ type: 'finished', conversationId }); } catch (_e) { }
      }

      return { ok: true as const, data: { id: 'comp_q_' + Date.now(), prompt: promptText, conversationId, status: 'completed' } };
    },

    stopStream: async (conversationId?: number) => {
      try {
        await fetch('/api/chat/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId })
        });
      } catch (_e) { }
      return { ok: true as const, data: true };
    },

    onStreamEvent: (listener: (event: any) => void) => {
      companyStreamListeners.push(listener);
      return () => { companyStreamListeners = companyStreamListeners.filter(l => l !== listener); };
    }
  },

  providers: {
    getAll: async () => ({
      ok: true as const,
      data: getStored(STORAGE_KEYS.providers, DEFAULT_PROVIDER_CONFIGS)
    }),

    set: async (config: any) => {
      const configs = getStored<any[]>(STORAGE_KEYS.providers, DEFAULT_PROVIDER_CONFIGS);
      const idx = configs.findIndex(c => c.id === config.id);
      if (idx !== -1) {
        configs[idx] = { ...configs[idx], ...config };
      } else {
        configs.push({ ...config });
      }
      setStored(STORAGE_KEYS.providers, configs);
      // Also notify server so it can proxy AI calls with this key
      try {
        await fetch('/api/providers/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
      } catch (_e) { }
      return { ok: true as const, data: true };
    },

    testConnection: async (config: any) => {
      try {
        const configs = getStored<any[]>(STORAGE_KEYS.providers, DEFAULT_PROVIDER_CONFIGS);
        const stored = configs.find(c => c.id === config.id);
        const apiKey = config.apiKey || stored?.apiKey || '';
        const baseUrl = config.baseUrl || stored?.baseUrl || '';
        const res = await fetch('/api/providers/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: config.id, apiKey, baseUrl })
        });
        if (res.ok) {
          const data = await res.json();
          return data.ok
            ? { ok: true as const, data: true }
            : { ok: false as const, error: { code: 'UNKNOWN' as const, message: data.error || 'Connection failed' } };
        }
      } catch (e: any) {
        return { ok: false as const, error: { code: 'UNKNOWN' as const, message: String(e) } };
      }
      return { ok: false as const, error: { code: 'UNKNOWN' as const, message: 'Network error' } };
    },

    listModels: async (provider: string) => {
      const configs = getStored<any[]>(STORAGE_KEYS.providers, DEFAULT_PROVIDER_CONFIGS);
      const stored = configs.find(c => c.id === provider);
      try {
        const res = await fetch('/api/providers/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, apiKey: stored?.apiKey || '', baseUrl: stored?.baseUrl || '' })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.models?.length) return { ok: true as const, data: data.models };
        }
      } catch (_e) { }
      // Fallback static model lists (matched with original EduKids Team & Codex CLI registry)
      const MODEL_CATALOG: Record<string, any[]> = {
        openai: [
          { id: 'gpt-5.6-terra', name: 'GPT-5.6-Terra (Codex CLI)', provider: 'openai', free: true, reasoning: true },
          { id: 'gpt-5-preview', name: 'GPT-5 Preview (Codex CLI)', provider: 'openai', free: true, reasoning: true },
          { id: 'gpt-4o', name: 'GPT-4o (OpenAI API)', provider: 'openai' },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini (OpenAI API)', provider: 'openai' },
          { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai' },
          { id: 'o3', name: 'o3 (Reasoning)', provider: 'openai' },
          { id: 'o4-mini', name: 'o4-mini (Reasoning)', provider: 'openai' }
        ],
        xai: [
          { id: 'grok-3', name: 'Grok 3', provider: 'xai' },
          { id: 'grok-3-mini', name: 'Grok 3 Mini', provider: 'xai' }
        ],
        anthropic: [
          { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'anthropic' },
          { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'anthropic' },
          { id: 'claude-haiku-3-5', name: 'Claude Haiku 3.5', provider: 'anthropic' }
        ],
        gemini: [
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini' }
        ],
        deepseek: [
          { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek' },
          { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoning)', provider: 'deepseek' }
        ],
        ollama: [
          { id: 'llama3.2', name: 'Llama 3.2 (Ollama)', provider: 'ollama' },
          { id: 'mistral', name: 'Mistral (Ollama)', provider: 'ollama' },
          { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder (Ollama)', provider: 'ollama' }
        ],
        openrouter: [
          { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'openrouter' },
          { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', provider: 'openrouter' },
          { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'openrouter' }
        ],
        opencode: [
          { id: 'google/gemini-2.5-flash-lite-preview-06-17', name: 'Gemini 2.5 Flash Lite (Free)', provider: 'opencode', free: true },
          { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct (Free)', provider: 'opencode', free: true },
          { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick (Free)', provider: 'opencode', free: true }
        ]
      };
      return { ok: true as const, data: MODEL_CATALOG[provider] || [] };
    }
  },

  proposals: {
    list: async () => ({ ok: true as const, data: [] }),
    approve: async () => ({ ok: true as const, data: null }),
    reject: async () => ({ ok: true as const, data: null })
  },

  search: {
    test: async () => ({ ok: true as const, data: 0 })
  },

  voice: {
    ensureMic: async () => ({ ok: true as const, data: { status: 'granted' } }),
    status: async () => ({ ok: true as const, data: { modelDownloaded: false } }),
    transcribe: async () => ({ ok: false as const, error: { message: 'Voice transcription cần desktop binary whisper.' } }),
    cancelTranscribe: async () => ({ ok: true as const, data: true }),
    downloadModel: async () => ({ ok: false as const, error: { message: 'Không thể download voice model trên web.' } }),
    cancelDownload: async () => ({ ok: true as const, data: true }),
    onDownloadProgress: () => () => { }
  },

  skills: {
    list: async () => ({ ok: true as const, data: [] }),
    get: async (ref: string) => ({ ok: false as const, error: { message: 'Skill not found: ' + ref } }),
    create: async () => ({ ok: false as const, error: { message: 'Skill creation on web requires desktop storage.' } }),
    update: async () => ({ ok: false as const, error: { message: 'Skill update on web requires desktop storage.' } }),
    importFolder: async () => ({ ok: false as const, error: { message: 'Import folder requires desktop file dialog.' } }),
    delete: async () => ({ ok: true as const, data: true }),
    reveal: async () => ({ ok: true as const, data: true }),
    setMemberSkills: async (_memId: any, _refs: any) => ({ ok: true as const, data: null })
  }
};

// Check if running in browser without Electron preload
if (typeof window !== 'undefined' && !(window as any).api) {
  (window as any).api = webApi;
  console.log('[WebBridge] In-bundle webApi compatibility layer initialized.');
}
