// Supabase-backed replacement for @base44/sdk
// Maintains the same API: base44.entities.EntityName.list/filter/create/update/delete
// + base44.auth, base44.integrations, base44.functions

import { supabase } from '@/lib/supabaseClient';

// Entity name → Supabase table name mapping
const TABLE_MAP = {
  Team: 'teams',
  Player: 'players',
  GameSchedule: 'game_schedules',
  MatchAnalysis: 'match_analyses',
  ProfessionalSummary: 'professional_summaries',
  TacticalGoal: 'tactical_goals',
  KeyMatchSituation: 'key_match_situations',
  TrainingProgram: 'training_programs',
  TrainingSessionEvaluation: 'training_session_evaluations',
  TrainingAction: 'training_actions',
  TacticalBoard: 'tactical_boards',
  LineupTemplate: 'lineup_templates',
  GamePrep: 'game_preps',
  Conversation: 'conversations',
  PlayerDecisionProfile: 'player_decision_profiles',
  MatchDecisionSummary: 'match_decision_summaries',
  TrainingProgramReview: 'training_program_reviews',
  ProgramOutcome: 'program_outcomes',
  DrillLibrary: 'drill_library',
  AnalyticsEvent: 'analytics_events',
  PlayerAttributeHistory: 'player_attribute_history',
  User: 'profiles',
};

// Fields that should be excluded when sending to Supabase (auto-managed)
const EXCLUDED_FIELDS = ['created_date', 'created_by', 'updated_date'];

const FIELD_ALIASES = {
  created_date: 'created_at',
  updated_date: 'updated_at',
  created_by: 'user_id',
};

function resolveField(field) {
  return FIELD_ALIASES[field] || field;
}

// Map old field names to new (Base44 → Supabase)
function mapFieldsForWrite(data) {
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (EXCLUDED_FIELDS.includes(key)) continue;
    if (key === 'id') continue;
    if (key === 'created_at' || key === 'updated_at') continue;
    if (key.startsWith('_')) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

// Map Supabase row back to Base44-compatible format
function mapRowForRead(row) {
  if (!row) return row;
  return {
    ...row,
    created_date: row.created_at,
    updated_date: row.updated_at,
    created_by: row.user_id,
  };
}

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

function createEntityAccessor(entityName) {
  const table = TABLE_MAP[entityName];
  if (!table) {
    console.warn(`Unknown entity: ${entityName}, falling back to: ${entityName.toLowerCase()}`);
  }
  const tableName = table || entityName.toLowerCase();

  return {
    async list(sortField, limit) {
      let query = supabase.from(tableName).select('*');

      if (sortField) {
        const desc = sortField.startsWith('-');
        const field = resolveField(desc ? sortField.slice(1) : sortField);
        query = query.order(field, { ascending: !desc });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapRowForRead);
    },

    async filter(filterObj, sortField, limit) {
      let query = supabase.from(tableName).select('*');

      if (filterObj && typeof filterObj === 'object') {
        for (const [key, value] of Object.entries(filterObj)) {
          if (key === 'created_by') continue;
          const col = resolveField(key);
          if (Array.isArray(value)) {
            query = query.in(col, value);
          } else {
            query = query.eq(col, value);
          }
        }
      }

      if (sortField) {
        const desc = sortField.startsWith('-');
        const field = resolveField(desc ? sortField.slice(1) : sortField);
        query = query.order(field, { ascending: !desc });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapRowForRead);
    },

    async create(data) {
      const userId = await getUserId();
      const payload = {
        ...mapFieldsForWrite(data),
        user_id: userId,
      };

      const { data: row, error } = await supabase
        .from(tableName)
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return mapRowForRead(row);
    },

    async update(id, data) {
      const payload = mapFieldsForWrite(data);
      delete payload.user_id; // never change ownership

      const { data: row, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapRowForRead(row);
    },

    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    },
  };
}

// Proxy so any entity name works dynamically
const entitiesProxy = new Proxy(
  {},
  {
    get(_target, entityName) {
      if (typeof entityName !== 'string') return undefined;
      return createEntityAccessor(entityName);
    },
  }
);

// ============================================================
// AUTH
// ============================================================
const auth = {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch profile from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      ...profile,
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || user.user_metadata?.full_name || '',
      role: profile?.role || 'user',
      access_status: profile?.access_status || 'paid',
      is_approved: profile?.is_approved ?? true,
      setup_complete: profile?.setup_complete ?? false,
      setup_team_id: profile?.setup_team_id || null,
    };
  },

  async updateMe(data) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  },

  async logout() {
    await supabase.auth.signOut();
  },

  redirectToLogin() {
    window.location.href = '/login';
  },
};

// ============================================================
// INTEGRATIONS (LLM, file upload, email)
// ============================================================
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildStubFromSchema(schema) {
  if (!schema || typeof schema !== 'object') return {};
  if (schema.type === 'object' && schema.properties) {
    const result = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (prop.type === 'string') result[key] = '';
      else if (prop.type === 'number' || prop.type === 'integer') result[key] = 0;
      else if (prop.type === 'boolean') result[key] = false;
      else if (prop.type === 'array') result[key] = [];
      else if (prop.type === 'object') result[key] = buildStubFromSchema(prop);
      else result[key] = null;
    }
    return result;
  }
  if (schema.type === 'array') return [];
  return {};
}

const integrations = {
  Core: {
    async InvokeLLM({ prompt, response_json_schema } = {}) {
      const errorResult = (message) => {
        if (response_json_schema) {
          return { ...buildStubFromSchema(response_json_schema), __ai_error: message };
        }
        return { response: '', __ai_error: message };
      };
      try {
        const { data, error } = await supabase.functions.invoke('invoke-llm', {
          body: { prompt, response_json_schema: response_json_schema || null },
        });
        if (error) throw error;
        if (data?.error) {
          const message = data.error_code === 'quota_exceeded'
            ? 'מכסת ה-AI היומית נוצלה במלואה. נסה שוב מאוחר יותר.'
            : 'שירות ה-AI אינו זמין כרגע. נסה שוב בעוד מספר דקות.';
          return errorResult(message);
        }
        // Edge function wraps the result in { data }
        const result = data?.data ?? data;
        if (response_json_schema) {
          return typeof result === 'object' && result !== null
            ? result
            : errorResult('שירות ה-AI החזיר תשובה לא תקינה. נסה שוב.');
        }
        return typeof result === 'string' ? result : (result?.response ?? '');
      } catch (e) {
        console.error('InvokeLLM failed:', e);
        return errorResult('שירות ה-AI אינו זמין כרגע. נסה שוב בעוד מספר דקות.');
      }
    },
    async UploadFile({ file } = {}) {
      if (!file) return { file_url: '' };
      // Upload to Supabase Storage
      const userId = await getUserId();
      const fileName = `${userId}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, file);

      if (error) {
        // Fallback to data URL if storage not configured
        const dataUrl = await fileToDataUrl(file);
        return { file_url: dataUrl };
      }

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(data.path);

      return { file_url: publicUrl };
    },
    async SendEmail() {
      return { success: true };
    },
  },
};

// ============================================================
// FUNCTIONS (serverless function invocations)
// ============================================================
async function handleAnalyzeMatchFile(params) {
  const { data, error } = await supabase.functions.invoke('analyze-match-file', {
    body: {
      mode: params?.mode || 'full',
      file_content: params?.file_content || '',
      our_team_name: params?.our_team_name || '',
      opponent_name: params?.opponent_name || '',
      question: params?.question || '',
    },
  });

  if (error) {
    throw new Error(error.message || 'Edge Function call failed');
  }

  return data;
}

const FUNCTION_STUBS = {
  sendLeadEmail: { success: true },
  syncToGoogleCalendar: { success: true, message: 'סנכרון יומן אינו זמין כרגע.' },
  createCheckoutSession: { success: true, url: '' },
  stripeWebhook: { success: true },
  eventSummaryReminder: { success: true },
};

const functions = {
  async invoke(functionName, params) {
    if (functionName === 'analyzeMatchFile') return await handleAnalyzeMatchFile(params);
    if (functionName === 'generateDeepAnalysis') {
      const { generateDeepAnalysis } = await import('@/lib/deepAnalysis.js');
      return await generateDeepAnalysis(params || {});
    }
    if (functionName === 'analyzeTeamProgress') {
      const { analyzeTeamProgress } = await import('@/lib/tacticalGoalsSync.js');
      return await analyzeTeamProgress(params?.teamId);
    }
    return FUNCTION_STUBS[functionName] || { success: true };
  },
};

// ============================================================
// EXPORT
// ============================================================
export const base44 = {
  entities: entitiesProxy,
  auth,
  integrations,
  functions,
};
