import { render, screen } from '@testing-library/react';
import StatCard from '../StatCard';
import { DollarSign } from 'lucide-react';

describe('StatCard', () => {
  it('renders value and subtitle', () => {
    render(
      <StatCard
        title="Общая Прибыль"
        value="$5000"
        subtitle="+12% за неделю"
        icon={DollarSign}
        trend="up"
      />
    );

    expect(screen.getByText('Общая Прибыль')).toBeInTheDocument();
    expect(screen.getByText('$5000')).toBeInTheDocument();
    expect(screen.getByText('+12% за неделю')).toBeInTheDocument();
  });

  it('shows skeleton when loading', () => {
    render(
      <StatCard
        title="Баланс"
        value="$1000"
        subtitle="данные обновляются"
        icon={DollarSign}
        isLoading
      />
    );

    expect(screen.getByText('Баланс')).toBeInTheDocument();
    expect(screen.queryByText('$1000')).not.toBeInTheDocument();
  });
});

