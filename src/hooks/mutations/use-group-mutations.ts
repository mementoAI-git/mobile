import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, put, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { CreateGroupBody, UpdateGroupBody, IGroup, AddGroupMembersBody } from '@/types';
import { useToast } from '@/components/ui/Toast';

export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateGroupBody) => post<{ data: IGroup }>(endpoint.groups, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      toast('Group created successfully', 'success');
    },
    onError: () => {
      toast('Failed to create group', 'error');
    },
  });
}

export function useUpdateGroup(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateGroupBody) => put<{ data: IGroup }>(endpoint.group.replace(':id', id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      toast('Group updated successfully', 'success');
    },
    onError: () => {
      toast('Failed to update group', 'error');
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => del(endpoint.group.replace(':id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      toast('Group deleted successfully', 'success');
    },
    onError: () => {
      toast('Failed to delete group', 'error');
    },
  });
}

export function useAddGroupMembers(groupId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: AddGroupMembersBody) => post(endpoint.groupMembers.replace(':id', groupId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      toast('Members updated', 'success');
    },
    onError: () => {
      toast('Failed to update members', 'error');
    },
  });
}
