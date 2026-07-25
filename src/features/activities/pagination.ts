export interface ActivitiesPageState {
  hasNextPage: boolean;
  page: number;
}

export function getNextActivitiesPage<T extends ActivitiesPageState>(lastPage: T): number | undefined {
  return lastPage.hasNextPage ? lastPage.page + 1 : undefined;
}
