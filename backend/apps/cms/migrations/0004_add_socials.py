from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0003_add_navigation'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='socials',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
