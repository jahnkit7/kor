-- Insert 7 roadmap items from CSV
INSERT INTO public.roadmap_items (title, description, status, priority, category, created_by)
VALUES 
  ('Generateur de facture', 'N''est pas encore implémenté', 'in_progress', 'high', 'feature', NULL),
  ('Amelioration, UI settings user', 'Ranger mieux, garder abonnement visible en haut, les trucs comme parrainage peut etre a la suite de abonnement. Et les choses like supprime ton compte tout en bas', 'backlog', 'high', 'improvement', NULL),
  ('Modifier legerement Style classic user', 'faire avec les meme finition soft comme dashboard admin', 'backlog', 'high', 'improvement', NULL),
  ('Revoir Onboading user', 'Les infos que l''utilisateur inscrit ne sont pas afficher sur sa page cote admin. Et ensuite je ne me rappele plus le reste de ce que fesait onboarding.', 'in_progress', 'urgent', 'bug', NULL),
  ('Mode hors ligne', 'Actuellement, lorsqu''on fait une operation, ca refuse. Alors que normalement, ca devrait etre storer localement, et quand il y a du reseau, pousser les donner dans la bdd. Donc il ne faut pas oublier de faire des sync. Pour l''instant se focaliser sur les ventes et les dettes. ', 'testing', 'urgent', 'improvement', NULL),
  ('Gestion stock', 'Qu''est-ce qui se passe, lorsqu''un utilisateur ne veut pas la gestion de stock ? Le menu lui est visible, mais que doit-on afficher ? Lorsque cette feature lui ait desactive alors qu''il a des donnes dans la table, le desactiver lui efface aussi les donnes ?', 'testing', 'high', 'improvement', NULL),
  ('Transcription offline', 'Comment ca fonctionne la transcription ? Lorsque l''appli est offline, on ne peut pas appeler l''edge function. Faut-il prevoir une alternative ? Genre l''API du browser de transcription ? Je crois que c''est gratuit ca..', 'in_progress', 'urgent', 'performance', NULL)
ON CONFLICT DO NOTHING;