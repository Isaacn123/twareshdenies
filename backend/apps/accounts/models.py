from django.db import models


class Role(models.Model):
    slug = models.SlugField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    can_manage_users = models.BooleanField(default=False)
    can_manage_content = models.BooleanField(default=True)
    can_view_submissions = models.BooleanField(default=True)
    can_manage_investors = models.BooleanField(default=False)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE, related_name='profile')
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name='users')

    def __str__(self):
        return f'{self.user.username} ({self.role.name})'
