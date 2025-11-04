"""
Authentication views
"""
from rest_framework import status, generics, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Organization, UserProfile, AuditLog
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    OrganizationSerializer, UserProfileSerializer,
    ChangePasswordSerializer, AuditLogSerializer
)
from .permissions import IsAdmin, IsManager
from .utils import log_action


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Log action
        log_action(
            user=user,
            action='create',
            resource='user',
            resource_id=str(user.id),
            details={'username': user.username},
            request=request
        )
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(generics.GenericAPIView):
    """
    User login endpoint
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )

        if not user:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'User account is disabled'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not hasattr(user, 'profile') or not user.profile.is_active:
            return Response(
                {'error': 'User profile is inactive'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        # Log action
        log_action(
            user=user,
            action='login',
            resource='auth',
            details={'username': user.username},
            request=request
        )

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Login successful'
        })


class LogoutView(generics.GenericAPIView):
    """
    User logout endpoint
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Log action
            log_action(
                user=request.user,
                action='logout',
                resource='auth',
                request=request
            )
            
            # Blacklist the refresh token
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({'message': 'Logout successful'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """
    Get and update current user information
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        
        # Log action
        log_action(
            user=request.user,
            action='update',
            resource='user',
            resource_id=str(request.user.id),
            request=request
        )
        
        return response


class ChangePasswordView(generics.GenericAPIView):
    """
    Change user password
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        
        # Check old password
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': 'Old password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set new password
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        # Log action
        log_action(
            user=user,
            action='update',
            resource='password',
            request=request
        )
        
        return Response({'message': 'Password changed successfully'})


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Organization CRUD
    Only admins can create/update/delete organizations
    """
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        # Users can only see their own organization
        if self.request.user.is_superuser:
            return Organization.objects.all()
        
        if hasattr(self.request.user, 'profile'):
            return Organization.objects.filter(id=self.request.user.profile.organization.id)
        
        return Organization.objects.none()


class UserProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for UserProfile management
    Admins can manage users in their organization
    """
    serializer_class = UserProfileSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        # Users can only see profiles in their organization
        if not hasattr(self.request.user, 'profile'):
            return UserProfile.objects.none()
        
        return UserProfile.objects.filter(
            organization=self.request.user.profile.organization
        )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing audit logs
    Only managers and admins can view logs
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsManager]
    
    def get_queryset(self):
        # Users can only see logs from their organization
        if not hasattr(self.request.user, 'profile'):
            return AuditLog.objects.none()
        
        return AuditLog.objects.filter(
            organization=self.request.user.profile.organization
        )
