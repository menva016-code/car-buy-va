import { createClient } from "jsr:@supabase/supabase-js@2";

import type {
  Appraisal,
  AppraisalPhoto,
} from "./types.ts";

export class DatabaseService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  async getAppraisal(appraisalId: string): Promise<Appraisal> {
    const { data, error } = await this.supabase
      .from("appraisals")
      .select("*")
      .eq("id", appraisalId)
      .single();

    if (error) {
      throw error;
    }

    return data as Appraisal;
  }

  async getPhotos(appraisalId: string): Promise<AppraisalPhoto[]> {
    const { data, error } = await this.supabase
      .from("appraisal_photos")
      .select("*")
      .eq("appraisal_id", appraisalId)
      .order("created_at");

    if (error) {
      throw error;
    }

    return (data ?? []) as AppraisalPhoto[];
  }

  async ensureNotSent(appraisalId: string): Promise<Appraisal> {
    const appraisal = await this.getAppraisal(appraisalId);

    if (appraisal.approval_status === "sent") {
      throw new Error("Карточка уже отправлена на согласование.");
    }

    return appraisal;
  }

  async load(appraisalId: string): Promise<{
    appraisal: Appraisal;
    photos: AppraisalPhoto[];
  }> {
    const [appraisal, photos] = await Promise.all([
      this.ensureNotSent(appraisalId),
      this.getPhotos(appraisalId),
    ]);

    return {
      appraisal,
      photos,
    };
  }

  async markAsSent(appraisalId: string): Promise<void> {
    const { error } = await this.supabase
      .from("appraisals")
      .update({
        approval_status: "sent",
        approval_sent_at: new Date().toISOString(),
      })
      .eq("id", appraisalId);

    if (error) {
      throw error;
    }
  }
}