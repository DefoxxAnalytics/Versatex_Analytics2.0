"""
Custom permissions for role-based access control
"""
from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permission class for admin-only access
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.is_admin()
        )


class IsManager(permissions.BasePermission):
    """
    Permission class for manager and admin access
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.is_manager()
        )


class CanUploadData(permissions.BasePermission):
    """
    Permission class for users who can upload data
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.can_upload_data()
        )


class CanDeleteData(permissions.BasePermission):
    """
    Permission class for users who can delete data
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.can_delete_data()
        )


class IsSameOrganization(permissions.BasePermission):
    """
    Permission class to ensure users can only access their organization's data
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        if not hasattr(request.user, 'profile'):
            return False
        
        # Check if object has organization field
        if hasattr(obj, 'organization'):
            return obj.organization == request.user.profile.organization
        
        # Check if object has user field with profile
        if hasattr(obj, 'user') and hasattr(obj.user, 'profile'):
            return obj.user.profile.organization == request.user.profile.organization
        
        return False
