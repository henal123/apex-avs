export interface SharedGallery {
  id: string;
  brand_id: string;
  org_id: string | null;
  share_token: string;
  title: string;
  description: string;
  selected_ad_ids: string[];
  is_active: boolean;
  is_password_protected: boolean;
  expires_at: string | null;
  view_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}
