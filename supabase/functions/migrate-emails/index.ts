import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin using anon client
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await anonClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Accès admin requis" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client to access auth.users
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // List all users with @dekon.local emails
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(JSON.stringify({ error: "Erreur lors de la récupération des utilisateurs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const usersToMigrate = usersData.users.filter(u => u.email?.endsWith("@dekon.local"));
    const results: { success: string[]; failed: string[] } = { success: [], failed: [] };

    for (const userToUpdate of usersToMigrate) {
      const oldEmail = userToUpdate.email!;
      const newEmail = oldEmail.replace("@dekon.local", "@kor.local");

      try {
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
          userToUpdate.id,
          { email: newEmail }
        );

        if (updateError) {
          console.error(`Failed to update ${oldEmail}:`, updateError);
          results.failed.push(oldEmail);
        } else {
          console.log(`Migrated ${oldEmail} -> ${newEmail}`);
          results.success.push(oldEmail);
        }
      } catch (err) {
        console.error(`Exception updating ${oldEmail}:`, err);
        results.failed.push(oldEmail);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Migration terminée",
        total: usersToMigrate.length,
        migrated: results.success.length,
        failed: results.failed.length,
        details: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Migration error:", error);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
