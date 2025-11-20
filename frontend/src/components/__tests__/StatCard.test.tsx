/// <reference types="vitest" />
import { render, screen } from '@testing-library/react';
import StatCard from '../StatCard';
import { DollarSign } from 'lucide-react';

describe('StatCard', () => {
  it('renders value and subtitle', () => {
    render(
      <StatCard
        title="Total Profit"
        value="$5000"
        subtitle="+12% this week"
        icon={DollarSign}
        trend="up"
      />
    );

    expect(screen.getByText('Total Profit')).toBeInTheDocument();
    expect(screen.getByText('$5000')).toBeInTheDocument();
    expect(screen.getByText('+12% this week')).toBeInTheDocument();
  });

  it('shows skeleton when loading', () => {
    render(
      <StatCard
        title="Balance"
        value="$1000"
        subtitle="updating data"
        icon={DollarSign}
        isLoading
      />
    );

    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.queryByText('$1000')).not.toBeInTheDocument();
  });
});
