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
      toast('Group created.', 'success');
    },
    onError: () => {
      toast('Couldn’t create the group. Try again.', 'error');
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
      toast('Group updated.', 'success');
    },
    onError: () => {
      toast('Couldn’t update the group. Try again.', 'error');
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
      toast('Group deleted.', 'success');
    },
    onError: () => {
      toast('Couldn’t delete the group. Try again.', 'error');
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
      toast('Couldn’t update the group members. Try again.', 'error');
    },
  });
}
