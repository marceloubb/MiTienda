# Hand-written for H6 (email uniqueness): NULL -> '' normalization plus a
# partial unique index on non-empty emails (Postgres + SQLite >= 3.35).
#
# Implemented with RunSQL because a migration operation's AddConstraint
# resolves model_name inside the migration's own app ('users'), so it cannot
# target the auth app's User model from here. RunSQL produces exactly the
# partial unique index AddConstraint would have generated for this rule.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_role_backfill'),
    ]

    operations = [
        # Idempotent data cleanup: no NULL emails survive normalization.
        migrations.RunSQL(
            "UPDATE auth_user SET email='' WHERE email IS NULL",
            migrations.RunSQL.noop,
        ),
        # Conditional unique index: duplicate non-empty emails are impossible;
        # empty emails ('' ) remain repeatable.
        migrations.RunSQL(
            "CREATE UNIQUE INDEX user_email_unique_nonempty "
            "ON auth_user (email) WHERE email <> ''",
            "DROP INDEX user_email_unique_nonempty",
        ),
    ]